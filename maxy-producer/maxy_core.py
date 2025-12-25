from common.maxy_common import DeciperByte,DeciperData
from flask import Flask, request, jsonify
from kafka import KafkaProducer
import logging
import logging.handlers
import os
import sys
import settings
import requests
import warnings
warnings.filterwarnings(action='ignore')
logger = logging.getLogger('maxy')
app = Flask(__name__)

app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024 # 200MB

# # 세션 비활성화 설정
app.config['SESSION_TYPE'] = 'null'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = False
app.secret_key = None  # 세션 비활성화 시 secret_key가 필요 없음

def LogSet():
    # 로그 기록 설정
    file_handler = logging.handlers.TimedRotatingFileHandler(filename=os.path.join("Log","maxysvc.txt"), 
                                                             when='midnight', interval=1,  
                                                             encoding='utf-8')
    file_handler.suffix = 'log_%Y-%m-%d' # 파일명 끝에 붙여줌; ex. log-20190811
    stream_handler = logging.StreamHandler(sys.stdout)
    file_handler.setLevel(logging.ERROR)
    stream_handler.setLevel(logging.WARNING)
    logging.basicConfig(format = '%(asctime)s:[%(module)s]%(levelname)s - %(message)s',
                        datefmt = '%Y-%m-%d %p %I:%M:%S',
                        handlers=[file_handler, stream_handler],
                        level=logging.WARNING)
    
def SendAccHist(device_id,server_type,package_id,page_start_tm,os_type,app_version,login):
    try:
        url = f'{settings.MaxyfiledbURL}/put'
        post = {"index":"acc_hist"}
        ostype = 3
        if os_type == 'iOS': ostype = 1
        elif os_type == 'Android': ostype = 0
        #0:Access History
        key = f'{device_id},{server_type}'
        value = f'0,{ostype},{page_start_tm},\
{package_id},{server_type},{app_version},{login}'
        
        post["data"] = [[key,value]]
        response = requests.post(url, json=post)
        if response.status_code != 200:
            logger.error(f"{response.text}")
    except Exception as e:
        logger.error(f"SendAccHist {str(e)}") 
        
gKafkaProducer = None
def SendMessagePage(topic,Messages,encrypt):
    global gKafkaProducer
    try:
        arrMsg = Messages.split('\n')
        if gKafkaProducer is None:
            gKafkaProducer = KafkaProducer(
                bootstrap_servers=settings.KafkaURL
                # ,compression_type='snappy'
            )
        for msg in arrMsg:
            if len(msg) == 0: continue
            msg = DeciperByte(msg) if encrypt == 'Y' else msg.encode('utf-8')
            # arrmsg = msg.decode().split(',')
            # if arrmsg[48] == '1048580':
            #     device_id = arrmsg[0]
            #     server_type = arrmsg[2]
            #     package_id = arrmsg[1]
            #     os_type = arrmsg[3]
            #     page_start_tm = arrmsg[15]
            #     app_version = arrmsg[5]
            #     login = arrmsg[12]
            #     SendAccHist(device_id,server_type,package_id,page_start_tm,os_type,app_version,login)
                
            
            gKafkaProducer.send(topic, msg)
        gKafkaProducer.flush()
    except Exception as e:
        logger.error(f"SendMessage: {e}")
        if gKafkaProducer is not None:
            gKafkaProducer.close()  # 프로듀서 종료
            gKafkaProducer = None
        return False
    return True

def GetLogType(data):
    first_comma = data.find(',')
    second_comma = data.find(',', first_comma + 1)
    third_comma = data.find(',', second_comma + 1)
    if third_comma == -1:  # 세 번째 콤마가 없을 경우, 문자열 끝까지
        third_value = data[second_comma + 1:]
    else:
        third_value = data[second_comma + 1:third_comma]
    return third_value;

gKafkaProducer2 = None
gTranslation_table = str.maketrans({'^': ',', '|': '\n'})
def SendMessageTotal(topic,Messages,encrypt):
    global gKafkaProducer2
    try:
        arrMsg = Messages.split('\n')
        if gKafkaProducer2 is None:
            gKafkaProducer2 = KafkaProducer(
                bootstrap_servers=settings.KafkaURL
            )
        url = f'{settings.MaxyfiledbURL}/puts'
        post = {"index":"waterfall"}
        rowdata = []
        for msg in arrMsg:
            if len(msg) == 0: continue
            demsg = DeciperData(msg) if encrypt == 'Y' else msg
            row = demsg.split(",")
            if row[2] == "131079":
                key = f'{row[1]}#{row[41]}#{row[0]}' #device_id#page_id#log_tm
                value = row[12].translate(gTranslation_table)
                rowdata.append([key,value])
            else:
                gKafkaProducer2.send(topic, demsg.encode('utf-8'))
        gKafkaProducer2.flush()
        if len(rowdata) > 0:
            try:
                post["data"] = rowdata
                response = requests.post(url, json=post)
                if response.status_code != 200:
                    logger.error(f"{response.text}")
            except Exception as e2:
                logger.error(f"filedb: {e2}")

    except Exception as e:
        logger.error(f"SendMessage: {e}")
        if gKafkaProducer2 is not None:
            gKafkaProducer2.close()  # 프로듀서 종료
            gKafkaProducer2 = None
        return False
    return True

@app.route('/maxy/logCollect.maxy', methods=['POST'])
def logCollect():
    try:
        Messages = request.form.get('mpasMsg')
        encrypt = request.form.get('encrypt')
        topic = 'total-logs'
        if not SendMessageTotal(topic,Messages,encrypt):
            return "error",401
    except Exception as e:
        logger.error(f'logCollect {str(e)} {request.form}')
    return 'ok',200


@app.route('/maxy/pageInfoCollect.maxy', methods=['POST'])
def pageInfoCollect():
    try:
        Messages = request.form.get('mpasMsg')
        encrypt = request.form.get('encrypt')
        topic = 'page-logs'
        if not SendMessagePage(topic,Messages,encrypt):
            return "error",401
    except Exception as e:
        logger.error(f'pageInfoCollect {Messages},{str(e)}')
    return 'ok',200


@app.route('/maxy/minkSvc', methods=['POST'])
def minkSvc():
    query_param = request.args.get('post')
    deviceId = request.form.get('deviceId')
    appId = request.form.get('appId')
    serverType = request.form.get('serverType')
    model = request.form.get('model')
    
    host = request.host
    
    Result = {}
    if query_param == "targetAppChk":
        Result = {
            "res":{
                "vipYn":"N",
                "targetId":568962,
                "webPerfCheckYn":"Y",
                "modelNo":f"{model}",
                "packageNm":f"{appId}",
                "deviceId":f"{deviceId}",
                "jsUrl":"",
                "BundleUnits":10,
                "serverType":serverType,
                "exceptStr":[],
                "LoggingInterval":60,
                "useYn":"Y",
                "LogAddr":f"http://{host}/maxy/logCollect.maxy",
                "PageLogAddr":f"http://{host}/maxy/pageInfoCollect.maxy"
                },
            "code":"200"
            }
    return jsonify(Result)

@app.route('/test', methods=['GET'])
def minkcheck():
    return "OK",200

if __name__ == '__main__':
    LogSet()
    app.run(settings.BindIP,settings.Port)
else:
    LogSet()
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
    