from pyspark.sql import SparkSession
from common.maxy_common import Deciper,ToCRC
from pyspark.sql.functions import split,col,pandas_udf,PandasUDFType,explode,max,sum,min,count,\
    expr,when,window,year,month,dayofmonth,hour,minute,substring,length,regexp_replace,from_unixtime,unix_timestamp,lower,size,\
        current_timestamp
from pyspark.sql.types import LongType,StringType,ArrayType,StructField,StructType,ArrayType,IntegerType,DoubleType,FloatType
import requests
import logging
from opensearchpy import OpenSearch,AsyncOpenSearch
import pandas as pd
import logging 
from pyspark.errors import PySparkException
from datetime import datetime
import os
import time
# Fold4 에서 실행하려며
# import os
# import sys
# os.environ['PYSPARK_PYTHON'] = sys.executable
# os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable
logger = logging.getLogger('maxy')


def _log_opensearch(action: str, target: str, duration_ms: float, hits=None, query=None, error: Exception = None):
    base = f"[OPENSEARCH] {action} target={target} duration_ms={duration_ms:.1f}"
    if hits is not None:
        base += f" hits={hits}"
    if error is not None:
        base += f" error={error}"
        if query is not None:
            logger.error(f"{base}\nQUERY: {query}")
        else:
            logger.error(base)
    else:
        if query is not None:
            logger.info(f"{base}\nQUERY: {query}")
        else:
            logger.info(base)

scala_version = '2.12'
spark_version = '3.5.1'
#https://stackoverflow.com/questions/70374571/connecting-pyspark-with-kafka
packages = [
    f'org.apache.spark:spark-sql-kafka-0-10_{scala_version}:{spark_version}',
    f'org.apache.kafka:kafka-clients:3.3.2',
    f'org.elasticsearch:elasticsearch-spark-30_2.12:8.13.4' #엘라스틱서치..
]

def get_spark_session(appName,es_user,es_password,
                      executor_memory='8g',
                      driver_memory='8g',
                      offHeap_size='8g',
                      executor_cores=4,
                      executor_instances=4,
                      shuffle_partitions=8, # 200
                      local_cores = 1,
                      extraJavaOptions=None):
    """스파크 세션 객체를 리턴한다.
    https://spark.apache.org/docs/latest/configuration.html
    Args:
        appName (_type_): 이름을 지정해준다.
        executor_memory (str, optional): _description_. Defaults to '8g'.
        driver_memory (str, optional): _description_. Defaults to '8g'.
        offHeap_size (str, optional): _description_. Defaults to '8g'.
        extraJavaOptions (_type_, optional): -Divy.cache.dir=/store/Labortory/.ivy -Divy.home=/store/Labortory/.ivy  토커에서는 폴더를 명시적으로 지정해준다.
    Returns:
        _type_: spark 객체.
    """
    spark = (SparkSession.builder.appName(appName)
    .master(f'local[{local_cores}]')
    # .config("spark.default.parallelism", "24")
    # 도커에서 /.ivy 를 만들기 때문에 퍼미션에러가 난다. 원하는 위치에 라이므러리를 다운로드 한다.
    .config("spark.executor.memory", executor_memory)
    .config("spark.driver.memory", driver_memory)
    .config("spark.memory.offHeap.size",offHeap_size)
    .config("spark.memory.offHeap.enabled",True)
    .config("spark.jars.packages", ",".join(packages))
    .config("spark.driver.extraJavaOptions",extraJavaOptions if extraJavaOptions is not None else '')
    .config("es.net.http.auth", f"{es_user}:{es_password}")
    .config("spark.executor.cores",executor_cores)
    .config("spark.executor.instances",executor_instances)
    .config("spark.sql.shuffle.partitions",shuffle_partitions)
    .config("spark.sql.caseSensitive", "true")
    # 대용량으로 밀어 넣을때 refresh를 너무자주 하면 아래의 오류가 나온다. 아래의 오류가 나오는데 이런 옵션을 주어도 나온다. 그래도 좀더 안전하다고 한다.
    # HDD를 SSD로 변경하면 된다고 한다.
    # 오류 발생 : org.apache.spark.util.TaskCompletionListenerException: 
    # Connection error (check network and/or proxy settings)- all nodes failed; tried 
    # [[maxy.thinkm.co.kr:19201]] 
    .config("es.index.refresh_interval", "-1") 
    # .config("es.batch.size.bytes", "10mb")  # 일괄 처리 크기를 10MB로 설정
    # .config("es.index.auto.create", "true") #opensearch 인덱스 자동 생성 활성화
    .config("spark.ui.enabled",False)
    # .config("spark.driver.bindAddress","127.0.0.1")
    
    # BlockManagerMasterEndpoint: Fail to know the executor driver is alive or not.
    #https://stackoverflow.com/questions/31840492/how-to-avoid-spark-executor-from-getting-lost-and-yarn-container-killing-it-due
    # .config("spark.executor.memoryOverhead", '2g')
    .getOrCreate()
    )
    spark.sparkContext.setLogLevel('ERROR')
    return spark

def get_spark_readstream_fromkafka(spark,kafka_url,topic,fnc_decyper = None,
                                   offset='latest',
                                   maxOffsetsPerTrigger=None,
                                   partitions=None):
    
    
    if partitions is None:
        topicn = "subscribe"
        topicv = topic
    else:
        stopic = """{"%s":%s}"""
        topicv = stopic % (topic,partitions)
        topicn = "assign"
        
    """카프카의 데이터를 읽어온다.
    Args:
        topic (_type_): 토픽이름
        kafka_url (_type_): URL
        offset (_type_, optional): 어디서부터 읽어올 것인지. latest,earliest,dumps(start_topic_offsets))
    """
    if maxOffsetsPerTrigger is not None:
        streamObject = (spark.readStream.format('kafka')
                .option('kafka.bootstrap.servers',kafka_url)
                .option(topicn,topicv)      
# .option("startingOffsets", "earliest") #모든 토픽을 가져온다.(느리다)
                .option("startingOffsets", offset) 
# .option("startingOffsets",(dumps(start_topic_offsets))) #Debug #처음 실행시에는 데이터를 전부 만들어주어야 한다.    
                .option("maxOffsetsPerTrigger", maxOffsetsPerTrigger)  # 배치 당 최대 메시지 수를 100으로 제한
#Caused by: java.lang.IllegalStateException: Cannot fetch offset 3385658  카프카의 소스가 지워졌을 경우 나오는 현상이라고 한다. 
# https://stackoverflow.com/questions/64922560/pyspark-and-kafka-set-are-gone-some-data-may-have-been-missed
                .option("failOnDataLoss", "false") 
                #잘못된 데이터가 들어와서 쓰기시 오류가 발생했을 경우 다시 시도하지 않고 스킵?
                .option("park.streaming.receiver.writeAheadLog.enable","false")
                .load())
    else:
        streamObject = (spark.readStream.format('kafka')
            .option('kafka.bootstrap.servers',kafka_url)
            .option(topicn,topicv)         
            .option("startingOffsets", offset) 
            .option("failOnDataLoss", "false") 
            #잘못된 데이터가 들어와서 쓰기시 오류가 발생했을 경우 다시 시도하지 않고 스킵?
            .option("park.streaming.receiver.writeAheadLog.enable","false")
            .load())
    if fnc_decyper is None:
        return streamObject
    return fnc_decyper(streamObject)

def get_spark_maxy_log_frame(input):
    """카프카에서 인코딩된 데이터를 디코딩하여 데이터 프레임으로 변경한다.

    Args:
        input (_type_): maxy_log frame

    Returns:
        _type_: 디코딩된 maxy_log dataframe
    """
    DeciperDF = (
            input.selectExpr('timestamp',"CAST(value AS STRING) as value","CAST(key AS STRING) as key")
            .select('timestamp',split(col('value'),'\n').alias('value'),split(col('key'),'\^').alias('key'))
            # .withColumn('value2',Deciper(col('value')))
            .withColumn('server_type',col('key').getItem(2).cast(IntegerType()))
            .withColumn('package_id',lower(col('key').getItem(3)))
            .select('timestamp','server_type','package_id',explode('value').alias('value2'))
            .withColumn('value2',Deciper(col('value2')))
            .withColumn('value_len',length(col('value2')))
            .select('timestamp','server_type','package_id',split(col('value2'),',').alias('value2'),'value_len')
            .withColumn('log_tm',col('value2').getItem(0).cast(LongType()))
            .withColumn('time',col('log_tm').cast(DoubleType())/1000)
            .withColumn('time',from_unixtime('time').cast("timestamp"))
            
            #3분 미래의 데이터이면 nn테이블에 쌓이게 한다.
            .withColumn("anomaly", unix_timestamp(col("timestamp")) - unix_timestamp(col("time")))
            .withColumn("anomaly", when(col("anomaly") >= -180, 'n').otherwise('nn'))
            
            .withColumn("date", expr("date_format(time, 'yyyy-MM-dd')"))
            .withColumn("yearmonth", expr("date_format(time, 'yyyy-MM')"))
            .withColumn("day", expr("date_format(time, 'dd')"))
            .withColumn("hour", expr("date_format(time, 'HH')"))   #통계를 위해 시/분 
            .withColumn("minute", expr("date_format(time, 'mm')")) #통계를 위해 시/분
        
            .withColumn('device_id',col('value2').getItem(1))
            .withColumn('log_type',col('value2').getItem(2).cast(IntegerType()))
            .withColumn('network',lower(col('value2').getItem(3)))
            .withColumn('network',
                        when(col("network") == 'wifi', "1")
                        .when(col("network") == '2g', "2")
                        .when(col("network") == '3g', "3")
                        .when(col("network") == '4g', "4")
                        .when(col("network") == '5g', "5")
                        .otherwise(col("network")))
            .withColumn('os_version',regexp_replace(regexp_replace(col('value2').getItem(4),'\^',','),'\|',expr("char(10)")))
            .withColumn('app_version',regexp_replace(regexp_replace(col('value2').getItem(5),'\^',','),'\|',expr("char(10)")))
            .withColumn('model',regexp_replace(regexp_replace(col('value2').getItem(6),'\^',','),'\|',expr("char(10)")))
            .withColumn('os_type',
                        when(col("model").startswith('iPhone'), "iOS")
                        .when(col("model").startswith('iPad'), "iOS")
                        .when(col("model").startswith('Mac'), "iOS")
                        .when(col("model").startswith('Window'), "Windows")
                        .otherwise("Android"))
            .withColumn('memory',col('value2').getItem(7).cast(LongType()))
            .withColumn('cpu',col('value2').getItem(8).cast(IntegerType()))
            .withColumn('signal',col('value2').getItem(9))
            .withColumn('battery',col('value2').getItem(10))
            .withColumn('url',col('value2').getItem(11))
            .withColumn('url_key',split(col('value2').getItem(11),'\?').getItem(0)) #?을 분리해서 앞쪽의 데이터만 잘라온다.
            .withColumn('url_sub_key',mk_sub_key(col('value2').getItem(11))) #서브키를 만든다.
        
            # .withColumn('url',split(col('value2').getItem(11),'\?').getItem(0)) #?을 분리해서 앞쪽의 데이터만 잘라온다.
            # .withColumn('url',when(length('url') > 255, substring(col('url'),-255, len('url'))).otherwise(col('url'))) #key가 256이기 때문에 url자를때 뒤에서 255보다 크면 255로 자른다. 그렇지 않으면 그냥 url로 넣는다.
            .withColumn('value',regexp_replace(regexp_replace(col('value2').getItem(12),'\^',','),'\|',expr("char(10)")))
            .withColumn('interval_time',col('value2').getItem(13).cast(IntegerType()))
            .withColumn('free_disk',col('value2').getItem(14).cast(LongType()))
            .withColumn('total_disk',col('value2').getItem(15).cast(LongType()))
            .withColumn('timezone',col('value2').getItem(16))
            .withColumn('webkit',col('value2').getItem(17))
            .withColumn('build_version',col('value2').getItem(18))
            .withColumn('referer',col('value2').getItem(19))       
            .withColumn('ip',col('value2').getItem(20))
            .withColumn('carrier',col('value2').getItem(21))
            .withColumn('login',col('value2').getItem(22))
            
            .withColumn('page_url', when(size(col("value2")) > 29,mk_sub_key(col('value2').getItem(29))).otherwise(''))
            .drop('value2')    #불필요한 컬럼제거
            .drop('time')
            )
    # DeciperDF.printSchema()
    return DeciperDF



def get_spark_total_logs_frame(input):
    """카프카에서 인코딩된 데이터를 디코딩하여 데이터 프레임으로 변경한다.

    Args:
        input (_type_): maxy_log frame

    Returns:
        _type_: 디코딩된 maxy_log dataframe
    """
    DeciperDF = (
            input.selectExpr("CAST(value AS STRING) as value")
            .select(split(col('value'),',').alias('value2'))
            .withColumn('log_tm',col('value2').getItem(0).cast(LongType()))
            .withColumn('server_type',col('value2').getItem(26).cast(IntegerType()))
            .withColumn('package_id',lower(col('value2').getItem(25)))
            .withColumn('device_id',col('value2').getItem(1))
            .withColumn('log_type',col('value2').getItem(2).cast(IntegerType()))
            .withColumn('memory',col('value2').getItem(7).cast(LongType()))
            .withColumn('value',regexp_replace(regexp_replace(col('value2').getItem(12),'\^',','),'\|',expr("char(10)")))
            )
    # DeciperDF.printSchema()
    return DeciperDF

def get_spark_maxy_page_log_frame(input):
    """
    0  장치 고유 ID    　    PK                      //Basic Info
    1  앱 번들 ID    　    PK
    2  서버 유형    개발: 0 / QA: 1 / 운영: 2    PK
    3  운영체제 명    Android / iOS    PK
    4  앱 버전    　    PK
    5  운영체제 버전
    6  앱 빌드 버전
    7  장치 모델명
    8  통신 사업자 명.
    9  통신 감도
    10  string TimeZone
    11  vip 여부
    12  로그인 여부
    //Page Info
    13  요청 URL    　    AppStart -> AppStart 고정
    14  AppStart 부터의 해당 페이지 순번    　    AppStart -> 1
    15  페이지 시작 시간    UNIX Timestamp
    16  페이지 종료 시간    UNIX Timestamp
    17  부모 페이지 시작 시간    앱 시작 시간..(늘 같음)

    18  모든 event의 intervalTime 합
    19  pageStartTm 부터 pageEndTm 까지의 시간.
    20  webNav Start 부터 web Nav End 까지의 시간
    21  httpStartTm 부터 httpEndTm 까지의 시간
    22  http request cnt
    23  해당 페이지에서 발생한 모든 event 의 수
    24  해당 페이지에서 발생한 모든 error 의 수
    25  java script error count
    26  해당 페이지에서 발생한 모든 crash 의 수
    27  해당 페이지에서 발생한 모든 log 의 수
    //Device Usage Info
    28  해당 페이지에서의 배터리 용량 평균
    29  해당 페이지에서의 통신 감도 평균
    30  해당 페이지에서의 CPU 사용량 평균
    31  해당 페이지에서의 Memory 사용량 평균
    32  해당 페이지에서의 저장 용량 평균
    33  해당 페이지에서의 배터리 용량 평균
    34  해당 페이지에서의 통신 감도 최고치
    35  해당 페이지에서의 CPU 사용량 최고치
    36  해당 페이지에서의 Memory 사용량 최고치
    37  해당 페이지에서의 저장 용량 최고치
    38  해당 페이지에서의 배터리 용량 최저치
    39  해당 페이지에서의 통신 감도 최저치
    40  해당 페이지에서의 CPU 사용량 최저치
    41  해당 페이지에서의 Memory 사용량 최저치
    42  해당 페이지에서의 저장 용량 최저치
    43  해당 페이지에서의 배터리 용량 합
    44  해당 페이지에서의 통신 감도 합
    45  해당 페이지에서의 CPU 사용량 합
    46  해당 페이지에서의 Memory 사용량 합
    47  해당 페이지에서의 저장 용량 합
    48  Log Type
    49  워터풀 유무 (N)

    Args:
        input (_type_): maxy_log frame

    Returns:
        _type_: 디코딩된 maxy_log dataframe
    """
    DeciperDF = (
            input.selectExpr('timestamp',"CAST(value AS STRING) as value","CAST(key AS STRING) as key")
            .select('timestamp',split(col('value'),'\n').alias('value'),split(col('key'),'\^').alias('key'))
            .select('timestamp',explode('value').alias('value2'))
            .withColumn('value2',Deciper(col('value2')))
            .select('timestamp',split(col('value2'),',').alias('value2'))
            .withColumn('device_id',col('value2').getItem(0))
            .withColumn('device_id_c',ToCRC(col('device_id')))
            .withColumn('package_id',col('value2').getItem(1))
            .withColumn('server_type',col('value2').getItem(2).cast(IntegerType()))
            .withColumn('os_type',col('value2').getItem(3))
            .withColumn('app_version',regexp_replace(regexp_replace(col('value2').getItem(4),'\^',','),'\|',expr("char(10)")))
            .withColumn('os_version',regexp_replace(regexp_replace(col('value2').getItem(5),'\^',','),'\|',expr("char(10)")))
            .withColumn('build_version',regexp_replace(regexp_replace(col('value2').getItem(6),'\^',','),'\|',expr("char(10)")))
            .withColumn('model',regexp_replace(regexp_replace(col('value2').getItem(7),'\^',','),'\|','\n'))
            .withColumn('carrier',col('value2').getItem(8))
            .withColumn('signal',col('value2').getItem(9))
            .withColumn('timezone',col('value2').getItem(10))
            .withColumn('vip',col('value2').getItem(11))
            .withColumn('login',col('value2').getItem(12))
            .withColumn('url',col('value2').getItem(13))
            .withColumn('url_sub_key',mk_sub_key(col('value2').getItem(13))) #서브키를 만든다.
            .withColumn('url_key',ToCRC(col('url_sub_key')))
            .withColumn('flow_order',col('value2').getItem(14).cast(IntegerType()))
            
            .withColumn('page_start_tm',col('value2').getItem(15).cast(LongType()))
            .withColumn('time',col('page_start_tm').cast(DoubleType())/1000)
            .withColumn('time',from_unixtime('time').cast("timestamp"))
            
            #3분 미래의 데이터이면 nn테이블에 쌓이게 한다.
            .withColumn("anomaly", unix_timestamp(col("timestamp")) - unix_timestamp(col("time")))
            .withColumn("anomaly", when(col("anomaly") >= -180, 'n').otherwise('nn'))
            
            .withColumn("date", expr("date_format(time, 'yyyy-MM-dd')"))
            .withColumn("yearmonth", expr("date_format(time, 'yyyy-MM')"))
            .withColumn("day", expr("date_format(time, 'dd')"))
            .withColumn("hour", expr("date_format(time, 'HH')"))   #통계를 위해 시/분 
            .withColumn("minute", expr("date_format(time, 'mm')")) #통계를 위해 시/분
        
            .withColumn('page_end_tm',col('value2').getItem(16).cast(LongType()))
            .withColumn('parent_log_tm',col('value2').getItem(17).cast(LongType()))
            .withColumn('event_interval_tm',col('value2').getItem(18).cast(LongType()))
            .withColumn('interval_tm',col('value2').getItem(19).cast(LongType()))
            .withColumn('loading_tm',col('value2').getItem(20).cast(LongType()))
            .withColumn('response_tm',col('value2').getItem(21).cast(LongType()))
            .withColumn('request_count',col('value2').getItem(22).cast(IntegerType()))
            .withColumn('event_count',col('value2').getItem(23).cast(IntegerType()))
            .withColumn('error_count',col('value2').getItem(24).cast(IntegerType()))
            .withColumn('js_error_count',col('value2').getItem(25).cast(IntegerType()))
            .withColumn('crash_count',col('value2').getItem(26).cast(IntegerType()))
            .withColumn('log_count',col('value2').getItem(27).cast(IntegerType()))
            .withColumn('avg_battery_Lvl',col('value2').getItem(28).cast(FloatType()))
            .withColumn('avg_com_sens',col('value2').getItem(29).cast(FloatType()))
            .withColumn('avg_cpu_usage',col('value2').getItem(30).cast(FloatType()))
            .withColumn('avg_mem_usage',col('value2').getItem(31).cast(FloatType()))
            .withColumn('avg_storage_usage',col('value2').getItem(32).cast(FloatType()))
            .withColumn('max_battery_Lvl',col('value2').getItem(33).cast(LongType()))
            .withColumn('max_com_sens',col('value2').getItem(34).cast(LongType()))
            .withColumn('max_cpu_usage',col('value2').getItem(35).cast(LongType()))
            .withColumn('max_mem_usage',col('value2').getItem(36).cast(LongType()))
            .withColumn('max_storage_usage',col('value2').getItem(37).cast(LongType()))
            .withColumn('min_battery_lvl',col('value2').getItem(38).cast(LongType()))
            .withColumn('min_com_sens',col('value2').getItem(39).cast(LongType()))
            .withColumn('min_cpu_usage',col('value2').getItem(40).cast(LongType()))
            .withColumn('min_mem_usage',col('value2').getItem(41).cast(LongType()))
            .withColumn('min_storage_usage',col('value2').getItem(42).cast(LongType()))
            .withColumn('sum_battery_Lvl',col('value2').getItem(43).cast(LongType()))
            .withColumn('sum_com_sens',col('value2').getItem(44).cast(LongType()))
            .withColumn('sum_cpu_usage',col('value2').getItem(45).cast(LongType()))
            .withColumn('sum_mem_usage',col('value2').getItem(46).cast(LongType()))
            .withColumn('sum_storage_usage',col('value2').getItem(47).cast(LongType()))
            .withColumn('log_type', when(size(col("value2")) > 47,col('value2').getItem(48).cast(LongType())).otherwise(131073))
            .withColumn('wtf_flag', when(size(col("value2")) > 48,col('value2').getItem(49)).otherwise('N'))
            .drop('value2')    #불필요한 컬럼제거
            .drop('time')
            )
    
    # DeciperDF.na.drop()
    # DeciperDF.printSchema()
    return DeciperDF



def get_spark_page_logs_frame(input):
    """
    0  장치 고유 ID    　    PK                      //Basic Info
    1  앱 번들 ID    　    PK
    2  서버 유형    개발: 0 / QA: 1 / 운영: 2    PK
    3  운영체제 명    Android / iOS    PK
    4  앱 버전    　    PK
    5  운영체제 버전
    6  앱 빌드 버전
    7  장치 모델명
    8  통신 사업자 명.
    9  통신 감도
    10  string TimeZone
    11  vip 여부
    12  로그인 여부
    //Page Info
    13  요청 URL    　    AppStart -> AppStart 고정
    14  AppStart 부터의 해당 페이지 순번    　    AppStart -> 1
    15  페이지 시작 시간    UNIX Timestamp
    16  페이지 종료 시간    UNIX Timestamp
    17  부모 페이지 시작 시간    앱 시작 시간..(늘 같음)

    18  모든 event의 intervalTime 합
    19  pageStartTm 부터 pageEndTm 까지의 시간.
    20  webNav Start 부터 web Nav End 까지의 시간
    21  httpStartTm 부터 httpEndTm 까지의 시간
    22  http request cnt
    23  해당 페이지에서 발생한 모든 event 의 수
    24  해당 페이지에서 발생한 모든 error 의 수
    25  java script error count
    26  해당 페이지에서 발생한 모든 crash 의 수
    27  해당 페이지에서 발생한 모든 log 의 수
    //Device Usage Info
    28  해당 페이지에서의 배터리 용량 평균
    29  해당 페이지에서의 통신 감도 평균
    30  해당 페이지에서의 CPU 사용량 평균
    31  해당 페이지에서의 Memory 사용량 평균
    32  해당 페이지에서의 저장 용량 평균
    33  해당 페이지에서의 배터리 용량 평균
    34  해당 페이지에서의 통신 감도 최고치
    35  해당 페이지에서의 CPU 사용량 최고치
    36  해당 페이지에서의 Memory 사용량 최고치
    37  해당 페이지에서의 저장 용량 최고치
    38  해당 페이지에서의 배터리 용량 최저치
    39  해당 페이지에서의 통신 감도 최저치
    40  해당 페이지에서의 CPU 사용량 최저치
    41  해당 페이지에서의 Memory 사용량 최저치
    42  해당 페이지에서의 저장 용량 최저치
    43  해당 페이지에서의 배터리 용량 합
    44  해당 페이지에서의 통신 감도 합
    45  해당 페이지에서의 CPU 사용량 합
    46  해당 페이지에서의 Memory 사용량 합
    47  해당 페이지에서의 저장 용량 합
    48  Log Type
    49  워터풀 유무 (N)

    Args:
        input (_type_): maxy_log frame

    Returns:
        _type_: 디코딩된 maxy_log dataframe
    """
    DeciperDF = (
            input.selectExpr("CAST(value AS STRING) as value")
            .select(split(col('value'),',').alias('value2'))
            .withColumn('device_id',col('value2').getItem(0))
            .withColumn('device_id_c',ToCRC(col('device_id')))
            .withColumn('package_id',col('value2').getItem(1))
            .withColumn('server_type',col('value2').getItem(2).cast(IntegerType()))
            .withColumn('os_type',col('value2').getItem(3))
            .withColumn('app_version',regexp_replace(regexp_replace(col('value2').getItem(4),'\^',','),'\|',expr("char(10)")))
            .withColumn('os_version',regexp_replace(regexp_replace(col('value2').getItem(5),'\^',','),'\|',expr("char(10)")))
            .withColumn('build_version',regexp_replace(regexp_replace(col('value2').getItem(6),'\^',','),'\|',expr("char(10)")))
            .withColumn('model',regexp_replace(regexp_replace(col('value2').getItem(7),'\^',','),'\|',expr("char(10)")))
            .withColumn('carrier',col('value2').getItem(8))
            .withColumn('signal',col('value2').getItem(9))
            .withColumn('timezone',col('value2').getItem(10))
            .withColumn('vip',col('value2').getItem(11))
            .withColumn('login',col('value2').getItem(12))
            .withColumn('url',col('value2').getItem(13))
            .withColumn('url_sub_key',mk_sub_key(col('value2').getItem(13))) #서브키를 만든다.
            .withColumn('url_key',ToCRC(col('url_sub_key')))
            .withColumn('flow_order',col('value2').getItem(14).cast(IntegerType()))
            
            .withColumn('page_start_tm',col('value2').getItem(15).cast(LongType()))
            .withColumn('time',col('page_start_tm').cast(DoubleType())/1000)
            .withColumn('time',from_unixtime('time').cast("timestamp"))
            
            .withColumn("date", expr("date_format(time, 'yyyy-MM-dd')"))
            .withColumn("yearmonth", expr("date_format(time, 'yyyy-MM')"))
            .withColumn("day", expr("date_format(time, 'dd')"))
            .withColumn("hour", expr("date_format(time, 'HH')"))   #통계를 위해 시/분 
            .withColumn("minute", expr("date_format(time, 'mm')")) #통계를 위해 시/분
        
            .withColumn('page_end_tm',col('value2').getItem(16).cast(LongType()))
            .withColumn('parent_log_tm',col('value2').getItem(17).cast(LongType()))
            .withColumn('event_interval_tm',col('value2').getItem(18).cast(LongType()))
            .withColumn('interval_tm',col('value2').getItem(19).cast(LongType()))
            .withColumn('loading_tm',col('value2').getItem(20).cast(LongType()))
            .withColumn('response_tm',col('value2').getItem(21).cast(LongType()))
            .withColumn('request_count',col('value2').getItem(22).cast(IntegerType()))
            .withColumn('event_count',col('value2').getItem(23).cast(IntegerType()))
            .withColumn('error_count',col('value2').getItem(24).cast(IntegerType()))
            .withColumn('js_error_count',col('value2').getItem(25).cast(IntegerType()))
            .withColumn('crash_count',col('value2').getItem(26).cast(IntegerType()))
            .withColumn('log_count',col('value2').getItem(27).cast(IntegerType()))
            .withColumn('avg_battery_Lvl',col('value2').getItem(28).cast(FloatType()))
            .withColumn('avg_com_sens',col('value2').getItem(29).cast(FloatType()))
            .withColumn('avg_cpu_usage',col('value2').getItem(30).cast(FloatType()))
            .withColumn('avg_mem_usage',col('value2').getItem(31).cast(FloatType()))
            .withColumn('avg_storage_usage',col('value2').getItem(32).cast(FloatType()))
            .withColumn('max_battery_Lvl',col('value2').getItem(33).cast(LongType()))
            .withColumn('max_com_sens',col('value2').getItem(34).cast(LongType()))
            .withColumn('max_cpu_usage',col('value2').getItem(35).cast(LongType()))
            .withColumn('max_mem_usage',col('value2').getItem(36).cast(LongType()))
            .withColumn('max_storage_usage',col('value2').getItem(37).cast(LongType()))
            .withColumn('min_battery_lvl',col('value2').getItem(38).cast(LongType()))
            .withColumn('min_com_sens',col('value2').getItem(39).cast(LongType()))
            .withColumn('min_cpu_usage',col('value2').getItem(40).cast(LongType()))
            .withColumn('min_mem_usage',col('value2').getItem(41).cast(LongType()))
            .withColumn('min_storage_usage',col('value2').getItem(42).cast(LongType()))
            .withColumn('sum_battery_Lvl',col('value2').getItem(43).cast(LongType()))
            .withColumn('sum_com_sens',col('value2').getItem(44).cast(LongType()))
            .withColumn('sum_cpu_usage',col('value2').getItem(45).cast(LongType()))
            .withColumn('sum_mem_usage',col('value2').getItem(46).cast(LongType()))
            .withColumn('sum_storage_usage',col('value2').getItem(47).cast(LongType()))
            .withColumn('log_type', when(size(col("value2")) > 47,
                                         col('value2').getItem(48).cast(LongType())).otherwise(131073))
            .withColumn('wtf_flag', when(size(col("value2")) > 48,
                                         col('value2').getItem(49)).otherwise('N'))
            .drop('value2')    #불필요한 컬럼제거
            .drop('time')
            )
    
    # DeciperDF.na.drop()
    # DeciperDF.printSchema()
    return DeciperDF


def writestream_toes(input_df,opensearch_url,userid,password,query_name,index_name,checkpoint_path):
    """스트리밍데이터를 실시간 쓰기

    Args:
        input_df (_type_): 입력 스트리밍
        opensearch_url (_type_): URL
        query_name (_type_): SPark에서 나타내주는 쿼리이름
        index_name (_type_): ES에 저장할 인덱스 이름
        checkpoint_path (_type_): 복원을 위한 경로.

    Returns:
        _type_: _description_
    """
    
    date_field_name = ''
    resources = ''
    dateField = ''
    if index_name == 'maxy2_log':
        date_field_name = 'log_tm'
        resources = "%s-{package_id}-{server_type}-{date}"%index_name
        dateField = 'date'
    elif index_name == 'maxy2_page_log':
        date_field_name = 'page_start_tm'
        resources = "%s-{yearmonth}"%index_name
        dateField = 'yearmonth'
    else:
        logger.error(f'writestream_toes 확장 {index_name}')
        
    
    # # {anomaly}-{server_type}-{package_id}-{date} 파일에 null이 나오면 Exception이 난다. 
    # current_time_plus_3min = (unix_timestamp(current_timestamp()) + 180) * 1000
    current_time_plus_3min = int(datetime.now().timestamp() + 180) * 1000
    input_df = input_df.filter((col(date_field_name) < current_time_plus_3min) &\
                                col('server_type').isNotNull() & \
                                col('package_id').isNotNull() & \
                                col(dateField).isNotNull())
    outputDF = (input_df
    .writeStream
    .outputMode("append") 
    .format("org.elasticsearch.spark.sql") 
    .option("es.nodes",opensearch_url)
    .option('es.index.auto.create', 'true')
    .option("es.resource", resources) 
    .option("es.nodes.wan.only", 'true') 
    .option('checkpointLocation',f'./checkpoint/{checkpoint_path}') 
    .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
    .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
    .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
    .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
    .queryName(query_name)
    .start()
    )
    return outputDF
    
def writestream_batch(input_df,opensearch_url,userid,password,query_name,func_process,checkpoint_path,trigger='1 minute'):
    """스트리밍데이터를 실시간 쓰기

    Args:
        input_df (_type_): 입력 스트리밍
        opensearch_url (_type_): URL
        query_name (_type_): SPark에서 나타내주는 쿼리이름
        index_name (_type_): ES에 저장할 인덱스 이름
        checkpoint_path (_type_): 복원을 위한 경로.

    Returns:
        _type_: _description_
    """
    if trigger is not None:
        outputDF = (input_df
        .writeStream
        .foreachBatch(func_process) 
        .outputMode("append") 
        .option("es.nodes",opensearch_url)
        .option("es.nodes.wan.only", "true") 
        .trigger(processingTime=trigger) #Debug
        .option('checkpointLocation',f'./checkpoint/{checkpoint_path}') 
        .queryName(query_name)
        .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
        .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
        .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
        .option("es.net.ssl.protocol", "TLS")  # SSL 프로토콜을 지정합니다. (예: TLS)
        .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
        .start()
        )
    else:
        outputDF = (input_df
        .writeStream
        .foreachBatch(func_process) 
        .outputMode("append") 
        .option("es.nodes",opensearch_url)
        .option("es.nodes.wan.only", "true") 
        .option('checkpointLocation',f'./checkpoint/{checkpoint_path}') 
        .queryName(query_name)
        .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
        .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
        .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
        .option("es.net.ssl.protocol", "TLS")  # SSL 프로토콜을 지정합니다. (예: TLS)
        .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
        .start()
        )
    return outputDF

def write_toes(input_df,opensearch_url,userid,password,index_name,index_date='date',exception=True):
    """es 에 데이터 쓰기.

    Args:
        input_df (_type_): 입력 스트리밍
        opensearch_url (_type_): URL
        query_name (_type_): SPark에서 나타내주는 쿼리이름
        index_name (_type_): ES에 저장할 인덱스 이름
        checkpoint_path (_type_): 복원을 위한 경로.

    Returns:
        _type_: _description_
    """
    try:
        if index_date is not None:
            index_name = "%s-{package_id}-{server_type}-{%s}"%(index_name,index_date)
        outputDF = (input_df
        .write
        .mode('append')
        .format("org.elasticsearch.spark.sql") 
        .option("es.nodes",opensearch_url)
        .option('es.index.auto.create', 'true')
        .option("es.resource", index_name) 
        .option("es.nodes.wan.only", "true") 
        .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
        .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
        .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
        .option("es.net.ssl.protocol", "TLS")  # SSL 프로토콜을 지정합니다. (예: TLS)
        .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
        .save()
        )
    except PySparkException as e:
        logger.error(f'write_toes PySparkException {index_name} , {str(e)[:2048]}')
        if exception : WriteException(index_name,input_df,str(e))
    except Exception as e:
        logger.error(f'write_toes {index_name} , {str(e)[:2048]}')
        if exception : WriteException(index_name,input_df,str(e))
    return outputDF

def write_toes_page(input_df,opensearch_url,userid,password,index_name,index_date='yearmonth',exception=True):
    """es 에 데이터 쓰기.

    Args:
        input_df (_type_): 입력 스트리밍
        opensearch_url (_type_): URL
        query_name (_type_): SPark에서 나타내주는 쿼리이름
        index_name (_type_): ES에 저장할 인덱스 이름
        checkpoint_path (_type_): 복원을 위한 경로.

    Returns:
        _type_: _description_
    """
    try:
        if index_date is not None:
            # index_name = "%s-{package_id}-{server_type}-{%s}"%(index_name,index_date)
            index_name = "%s-{%s}"%(index_name,index_date)
        outputDF = (input_df
        .write
        .mode('append')
        .format("org.elasticsearch.spark.sql") 
        .option("es.nodes",opensearch_url)
        .option('es.index.auto.create', 'true')
        .option("es.resource", index_name) 
        .option("es.nodes.wan.only", "true") 
        .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
        .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
        .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
        .option("es.net.ssl.protocol", "TLS")  # SSL 프로토콜을 지정합니다. (예: TLS)
        .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
        .option("es.mapping.routing", "device_id")
        .option("es.mapping.id", "mapping_id") 
        .option("es.mapping.exclude", "mapping_id")
        #https://semode.tistory.com/24
        # .option("es.batch.size.entries", "2000")
        .option("es.batch.write.refresh", "false")
        .save()
        )
    except PySparkException as e:
        logger.error(f'write_toes_page PySparkException {index_name} , {str(e)[:2048]}')
        if exception: WriteException(index_name,input_df,str(e))
    except Exception as e:
        logger.error(f'write_toes_page {index_name} , {str(e)[:2048]}')
        if exception: WriteException(index_name,input_df,str(e))
    return outputDF

def write_toes_log(input_df,opensearch_url,userid,password,index_name,index_date='date',exception=True):
    """es 에 데이터 쓰기.

    Args:
        input_df (_type_): 입력 스트리밍
        opensearch_url (_type_): URL
        query_name (_type_): SPark에서 나타내주는 쿼리이름
        index_name (_type_): ES에 저장할 인덱스 이름
        checkpoint_path (_type_): 복원을 위한 경로.

    Returns:
        _type_: _description_
    """
    try:
        if index_date is not None:
            index_name = "%s-{package_id}-{server_type}-{%s}"%(index_name,index_date)
        outputDF = (input_df
        .write
        .mode('append')
        .format("org.elasticsearch.spark.sql") 
        .option("es.nodes",opensearch_url)
        .option('es.index.auto.create', 'true')
        .option("es.resource", index_name) 
        .option("es.nodes.wan.only", "true") 
        .option("es.net.http.auth.user", userid)    # OpenSearch 연결에 사용할 사용자 이름
        .option("es.net.http.auth.pass", password)  # OpenSearch 연결에 사용할 비밀번호
        .option("es.net.ssl", "true" if userid != '' else "false")  # SSL 사용 여부를 설정합니다.
        .option("es.net.ssl.protocol", "TLS")  # SSL 프로토콜을 지정합니다. (예: TLS)
        .option("es.net.ssl.cert.allow.self.signed", "true")  # SSL 인증서 검증을 비활성화합니다.
        .option("es.mapping.routing", "device_id")
        .option("es.mapping.id", "mapping_id") 
        .option("es.mapping.exclude", "mapping_id")
        #https://semode.tistory.com/24
        # .option("es.batch.size.entries", "2000")
        .option("es.batch.write.refresh", "false")
        .save()
        )
    except PySparkException as e:
        logger.error(f'write_toes_log PySparkException {index_name} , {str(e)[:2048]}')
        if exception: WriteException(index_name,input_df,str(e))
    except Exception as e:
        logger.error(f'write_toes_log {index_name} , {str(e)[:2048]}')
        if exception: WriteException(index_name,input_df,str(e))
    return outputDF
    
def put_opensearch(url,put_statement,username='',password=''):
    headers = {'Content-Type': 'application/json'}  # Adjust the headers based on your API requirements
    if username!='':
        auth = (username, password)
        response = requests.put(url, headers=headers, data=put_statement, auth=auth, verify=False)
    else:
        response = requests.put(url, headers=headers, data=put_statement)
    # logging.info(response.status_code)
    # logging.info(response.text)
    return response.status_code,response.text


def pos_opensearch(url,put_statement,username='',password=''):
    headers = {'Content-Type': 'application/json'}  # Adjust the headers based on your API requirements
    if username!='':
        auth = (username, password)
        response = requests.post(url, headers=headers, data=put_statement, auth=auth, verify=False)
    else:
        response = requests.post(url, headers=headers, data=put_statement)
    # logging.info(response.status_code)
    # logging.info(response.text)
    return response.status_code,response.text

def get_opensearch(url,put_statement,username='',password=''):
    headers = {'Content-Type': 'application/json'}  # Adjust the headers based on your API requirements
    if username!='':
        auth = (username, password)
        response = requests.get(url, headers=headers, data=put_statement, auth=auth, verify=False)
    else:
        response = requests.get(url, headers=headers, data=put_statement)
    # logging.info(response.status_code)
    # logging.info(response.text)
    return response.status_code,response.text
    


def open_opensearch(url,timeout=10,username='',password=''):
    if username != '':
        osh = OpenSearch(
        hosts = url,
        http_compress = True, # enables gzip compression for request bodies
        use_ssl = True,
        http_auth=(username, password),  # Provide username and password
        timeout=timeout,
        verify_certs=False)
    else:
        osh = OpenSearch(
        hosts = url,
        http_compress = True, # enables gzip compression for request bodies
        use_ssl = False,
        timeout=timeout)
    return osh

def open_aopensearch(url,timeout=10,username='',password=''):
    if username != '':
        osh = AsyncOpenSearch(
        hosts = url,
        http_compress = True, # enables gzip compression for request bodies
        use_ssl = True,
        http_auth=(username, password),  # Provide username and password
        timeout=timeout,
        verify_certs=False)
    else:
        osh = AsyncOpenSearch(
        hosts = url,
        http_compress = True, # enables gzip compression for request bodies
        use_ssl = False,
        timeout=timeout)
    return osh

def count_opensearch(hopen,index,query):
    total_number = None
    try:
        result = hopen.count(index=index,body=query)
        total_number = result['count']
    except Exception as e:
        logger.error(f'count_opensearch {str(e)}')
    return total_number

def mapping_opensearch(hopen,index):
    Result = None
    try:
        Result = hopen.indices.get_mapping(index=index)
    except Exception as e:
        logger.error(f'mapping_opensearch {str(e)}')
    return Result

def status_opensearch(hopen):
    Result = None
    try:
        Result = hopen.nodes.stats()
    except Exception as e:
        logger.error(f'status_opensearch {str(e)}')
    return Result
    
    
def search_opensearch(hopen,index,query,to_pandas=True):
    Result = None
    Code = 200
    total_hits = None
    start_ts = time.perf_counter()
    try:
        data = hopen.search(index=index,body=query)
        if isinstance(data, dict):
            hits_obj = data.get('hits', {})
            if isinstance(hits_obj, dict):
                total_hits = hits_obj.get('total', {}).get('value')
        
        if to_pandas:
            if 'aggregations' in data:
                for key in data['aggregations']:
                    Result = pd.json_normalize(data['aggregations'][key]['buckets'])
                    
                    cols = []
                    for c in Result.columns:
                        index = c.find('key.')
                        if index != -1:
                            size = len('key.')
                            c = c[index+size:]
                        index = c.find('.value')
                        if index != -1:
                            c = c[:index]
                        cols.append(c)
                    Result.columns = cols
                            
            else:
                Result = pd.json_normalize(data['hits']['hits'])
                Result = Result[Result.columns.difference(['_index','_id','_score'])]
                cols = []
                for c in Result.columns:
                    cols.append(c[8:])
                Result.columns = cols
        else:
            Result = data
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search', index, duration, hits=total_hits, query=query)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search', index, duration, query=query, error=e)
        Result = str(e)
        Code = -2
    return Code,Result


async def search_aopensearch(hopen,index,query,to_pandas=True,routing=None):
    Result = None
    Code = 200
    total_hits = None
    start_ts = time.perf_counter()
    try:
        data = await hopen.search(index=index,body=query,routing=routing)
        if isinstance(data, dict):
            hits_obj = data.get('hits', {})
            if isinstance(hits_obj, dict):
                total_hits = hits_obj.get('total', {}).get('value')
        
        if to_pandas:
            if 'aggregations' in data:
                for key in data['aggregations']:
                    Result = pd.json_normalize(data['aggregations'][key]['buckets'])
                    
                    cols = []
                    for c in Result.columns:
                        index = c.find('key.')
                        if index != -1:
                            size = len('key.')
                            c = c[index+size:]
                        index = c.find('.value')
                        if index != -1:
                            c = c[:index]
                        cols.append(c)
                    Result.columns = cols
                            
            else:
                Result = pd.json_normalize(data['hits']['hits'])
                Result = Result[Result.columns.difference(['_index','_id','_score'])]
                cols = []
                for c in Result.columns:
                    cols.append(c[8:])
                Result.columns = cols
        else:
            Result = data
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search_async', index, duration, hits=total_hits, query=query)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search_async', index, duration, query=query, error=e)
        Result = str(e)
        Code = -2
    return Code,Result

def search_opensearch_all(osh,table,query,limit=None,scroll='1m',debug=False):
    """
        10000건 이상의 데이터를 검색하려고 한다면...
    """
    DataFrame = None
    if debug: print('Query')
    start_ts = time.perf_counter()
    try:
        response = osh.search(
            index=table,
            scroll=scroll,
            body=query
        )
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search_all', table, duration, query=query, error=e)
        raise
    duration = (time.perf_counter() - start_ts) * 1000
    if response is None:
        _log_opensearch('search_all', table, duration, query=query, hits=0)
        return DataFrame
    hits = response['hits']['hits']
    scroll_id = response['_scroll_id']
    _log_opensearch('search_all', table, duration, hits=len(hits), query=query)
    while hits:
        result = pd.json_normalize(hits)
        result = result[result.columns.difference(['_index','_id','_score'])]
        cols = []
        for c in result.columns:
            cols.append(c[8:])
        result.columns = cols
        
        if DataFrame is None:
            DataFrame = result
        else:
            DataFrame = pd.concat([DataFrame,result],axis=0)
            
        if limit is not None and len(DataFrame) >= limit:
            DataFrame = DataFrame[:limit]
            break

        if debug: print(f'Query [{len(DataFrame)}]')
        scroll_start = time.perf_counter()
        response = osh.scroll(scroll_id=scroll_id, scroll=scroll)
        duration = (time.perf_counter() - scroll_start) * 1000
        if response is None: break
        hits = response['hits']['hits']
        _log_opensearch('search_all_scroll', table, duration, hits=len(hits))
        
    # 스크롤 종료
    osh.clear_scroll(scroll_id=scroll_id)
    print(response)
    return DataFrame



def search_opensearch_scroll(osh,table,query,scroll_name='1m'):
    start_ts = time.perf_counter()
    try:
        response = osh.search(
            index=table,
            scroll=scroll_name,
            body=query
        )
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search_scroll', table, duration, query=query, error=e)
        raise
    duration = (time.perf_counter() - start_ts) * 1000
    if response is None:
        _log_opensearch('search_scroll', table, duration, query=query, hits=0)
        return 0,None
    hits = response['hits']['hits']
    scroll_id = response['_scroll_id']
    _log_opensearch('search_scroll', table, duration, hits=len(hits), query=query)
    if hits is not None:
        result = pd.json_normalize(hits)
        result = result[result.columns.difference(['_index','_id','_score'])]
        cols = []
        for c in result.columns:
            cols.append(c[8:])
        result.columns = cols
    else:
        result = None
    return scroll_id,result

async def search_aopensearch_scroll(osh,table,query,scroll_name='1m'):
    start_ts = time.perf_counter()
    try:
        response = await osh.search(
            index=table,
            scroll=scroll_name,
            body=query
        )
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('search_scroll_async', table, duration, query=query, error=e)
        raise
    duration = (time.perf_counter() - start_ts) * 1000
    if response is None:
        _log_opensearch('search_scroll_async', table, duration, query=query, hits=0)
        return 0,None
    hits = response['hits']['hits']
    scroll_id = response['_scroll_id']
    _log_opensearch('search_scroll_async', table, duration, hits=len(hits), query=query)
    if hits is not None:
        result = pd.json_normalize(hits)
        result = result[result.columns.difference(['_index','_id','_score'])]
        cols = []
        for c in result.columns:
            cols.append(c[8:])
        result.columns = cols
    else:
        result = None
    return scroll_id,result

def search_opensearch_scroll_more(osh,scroll_name,scroll_id):
    start_ts = time.perf_counter()
    try:
        response = osh.scroll(scroll_id=scroll_id, scroll=scroll_name)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_more', scroll_id, duration, error=e)
        raise
    duration = (time.perf_counter() - start_ts) * 1000
    if response is None:
        _log_opensearch('scroll_more', scroll_id, duration, hits=0)
        return 0,None
    hits = response['hits']['hits']
    _log_opensearch('scroll_more', scroll_id, duration, hits=len(hits))
    if hits is not None:
        result = pd.json_normalize(hits)
        result = result[result.columns.difference(['_index','_id','_score'])]
        cols = []
        for c in result.columns:
            cols.append(c[8:])
        result.columns = cols
    else:
        result = None
    return scroll_id,result

async def search_aopensearch_scroll_more(osh,scroll_name,scroll_id):
    start_ts = time.perf_counter()
    try:
        response = await osh.scroll(scroll_id=scroll_id, scroll=scroll_name)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_more_async', scroll_id, duration, error=e)
        raise
    duration = (time.perf_counter() - start_ts) * 1000
    if response is None:
        _log_opensearch('scroll_more_async', scroll_id, duration, hits=0)
        return 0,None
    hits = response['hits']['hits']
    _log_opensearch('scroll_more_async', scroll_id, duration, hits=len(hits))
    if hits is not None:
        result = pd.json_normalize(hits)
        result = result[result.columns.difference(['_index','_id','_score'])]
        cols = []
        for c in result.columns:
            cols.append(c[8:])
        result.columns = cols
    else:
        result = None
    return scroll_id,result

def search_opensearch_close(osh,scroll_id):
    start_ts = time.perf_counter()
    try:
        osh.clear_scroll(body={'scroll_id': [scroll_id]}, ignore=(404, ))
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_close', scroll_id, duration)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_close', scroll_id, duration, error=e)
        raise
    # osh.clear_scroll(scroll_id=scroll_id)

async def search_aopensearch_close(osh,scroll_id):
    start_ts = time.perf_counter()
    try:
        await osh.clear_scroll(body={'scroll_id': [scroll_id]}, ignore=(404, ))
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_close_async', scroll_id, duration)
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('scroll_close_async', scroll_id, duration, error=e)
        raise    
    
def search_mget(hopen,table,ids):
    Code = 200
    Result = None
    start_ts = time.perf_counter()
    try:
        result = hopen.mget(index=table, body={'ids': ids})
        Result = pd.json_normalize(result['docs'])
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('mget', table, duration, hits=len(ids), query=str(ids))
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('mget', table, duration, query=str(ids), error=e)
        Code = -1
        Result = str(e)
    return Code,Result
    

def search_opensql(hopen,sql_query,to_pandas=True,limit=None):
    """SQL문장으로 Opensearch를 검색한다.
    을 설정해주어야 한다.
    #주의 너무 많이 콜하면 Too many dynamic script compilations within, max:  오류가 난다. 다이너믹 스크립트로 만들어져서 맥스가 될경우 오류가 난다.
    PUT _plugins/_query/settings
    {
        "transient": {
            "plugins.sql.enabled" : true,
            "plugins.sql.delete.enabled": "true",
            "plugins.query.size_limit" : 1000
        }
    }
    """
    Code = 200
    Result = None
    #쿼리시 리미트를 자동으로 붙혀준다.
    if limit is not None:
        sql_query = f'{sql_query} Limit {limit}'
        
    # # Define the SQL query
    start_ts = time.perf_counter()
    try:
        # SQL 쿼리 실행
        data = hopen.transport.perform_request(
            "POST",
            "/_plugins/_sql",
            body={"query": sql_query}
        )
        duration = (time.perf_counter() - start_ts) * 1000
        total_rows = None
        if isinstance(data, dict):
            rows = data.get('datarows')
            if rows is not None:
                total_rows = len(rows)
        if data['status'] == 200:
            # "schema": [
            #     {
            #     "name": "url_key",
            #     "type": "text"
            #     },
            #     {
            #     "name": "count(*)",
            #     "alias": "cnt",
            #     "type": "integer"
            #     }
            # ],
            # "datarows": [
            #     [
            #     "//m.youtube.com/api/stats/qoe",
            #     168931
            #     ],
            if to_pandas:
                cols = []
                for c in data['schema']:
                    if 'alias' in c:
                        cols.append(c['alias'])
                    else:
                        cols.append(c['name'])
                Result = pd.DataFrame(data['datarows'],columns=cols)
            else:
                Result = data
            _log_opensearch('sql', 'sql', duration, hits=total_rows, query=sql_query)
        else:
            Code = data['status']
            Result = f'search_opensql {data}'
            _log_opensearch('sql', 'sql', duration, query=sql_query, error=Result)
            logger.error(f'search_opensql {data}')
    except Exception as e:
        duration = (time.perf_counter() - start_ts) * 1000
        _log_opensearch('sql', 'sql', duration, query=sql_query, error=e)
        logger.error(f'search_opensql {str(e)}')
        Code = -1
        Result = str(e)
    return Code,Result


gSubKeyRule = None
def SetSubKeyRule(sbk):
    global gSubKeyRule
    gSubKeyRule = sbk


def mk_sub_key_org(row,SubKeyRule):
    if row is None or len(row) == 0: return ''
    arrow = row.split('?') #http://maxy.thinkm.co.kr?product=2910&curseId=239303 을 분리
    key = arrow[0]
    if SubKeyRule is None:
        return key #단순하게 ?로 분리해준다.
    rule_requrl,rule_query=SubKeyRule
    
    for pattern in rule_requrl:
        if pattern[0].match(key): 
            key = pattern[1]
            break
    # print(key)    
    if len(arrow) > 1 and key in rule_query: #변경해야할 키값이 존재 한다면...
        query_string = arrow[1]
        sQueryString = ''
        param_name_map = set(rule_query[key])
        params = query_string.split('&') #product=2910&curseId=239303 을 &로 분리
        for param in params: #[product=2910,curseId=239303] 을 product,2910 분리한다.
            arrparam = param.split('=')
            k = arrparam[0]
            v = arrparam[1] if len(arrparam) > 1 else ''
            if k in param_name_map: #룰에 필요한 쿼리스트링을 만든다.
                sQueryString = f"{sQueryString}&{k}={v}" if len(sQueryString) > 0 else f"{k}={v}"
        url_sub_key = f'{key}?{sQueryString}' ##http://maxy.thinkm.co.kr?product=2910 다시 재조립
    else: #룰이 없다면 단순하게 ?로 분리해준다.
        url_sub_key = key
        
    return url_sub_key
        
@pandas_udf(returnType=StringType())
def mk_sub_key(rows):
    """
    강좌같은 것은 같은 URL에 파라미터로 변경된다. 그래서 키값을 단순하게 ?로 하지 않고 ?code=value을 붙혀서 키를 만든다.
    """
    global gSubKeyRule
    return rows.apply(lambda rows: mk_sub_key_org(rows,gSubKeyRule))


gWriteException = 0
def WriteException(index_name,df,desc):
    """
    pyspark에서 opensearch에 쓰기시 오류가 났을 때 예외처리를 해준다.
    """
    global gWriteException
    try:
        index_name = index_name.split('-')[0]
        filename = f'{datetime.now().timestamp()}+{index_name}+{gWriteException}-{df.count()}'
        gWriteException+=1
        if os.path.exists('./excepts') == False:
            os.mkdir('./excepts')
        with open(f'./excepts/{filename}.txt', 'w') as file:
            file.write(desc)
        df.write.parquet(f'./excepts/{filename}')
    except Exception as e:
        logger.error(f'WriteException {str(e)}')
    
