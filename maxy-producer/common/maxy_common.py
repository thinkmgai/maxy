from pyspark.sql.functions import pandas_udf,PandasUDFType
from common.maxy_crypto import AES128Crypto
from pyspark.sql.types import StringType,ArrayType,ArrayType,DecimalType,LongType
import pandas as pd
import logging
import crcmod
import hashlib
from datetime import datetime, timedelta
import decimal

def md5enc(value):
    envalue = value.encode('utf-8')
    md5_hash = hashlib.md5(envalue).hexdigest()
    return md5_hash

gcrc64_func = crcmod.predefined.mkPredefinedCrcFun("crc-64")
gcrc32_func = crcmod.predefined.mkPredefinedCrcFun("crc-32")
def GetCRC(value):
    #pip install crcmod
    global gcrc64_func
    data = value.encode()
    crc_value = gcrc64_func(data)
    # return "{:016x}".format(crc_value)
    return crc_value

def GetCRCStr(value):
    return "{:016x}".format(GetCRC(value))

def Get32CRC(value):
    #pip install crcmod
    global gcrc32_func
    data = value.encode()
    crc_value = gcrc32_func(data)
    return decimal.Decimal(crc_value)

encrypt_key = [119, 107, 106, 109, 104, 110, 106, 112, 119, 107, 102, 97, 102, 112, 119, 110]
encrypt_key = [chr(c ^ 3) for c in encrypt_key]
encrypt_key = ''.join(encrypt_key)

# encrypt_key = "thinkmisthebestm"
cipher = AES128Crypto(encrypt_key)

def DeciperData(data):
    global cipher
    return cipher.decrypt(data)

def DeciperByte(data):
    global cipher
    return cipher.decryptbyte(data)

@pandas_udf(returnType=StringType())
def Deciper(rows):
    global cipher
    #웹에서는 인코딩해서 올리지 않음.
    return rows.apply(lambda x: cipher.decrypt(x) if ',' not in x and len(x) > 0 else x)
    # return pd.Series(res)

@pandas_udf(returnType=LongType())
def ToCRC(rows):
    """
    mapping_id 가 너무 길다. 그래서 crc값으로 변경한다.
    """
    return rows.apply(GetCRC)

@pandas_udf(returnType=StringType())
def ToCRCStr(rows):
    """
    mapping_id 가 너무 길다. 그래서 crc값으로 변경한다.
    """
    return rows.apply(GetCRCStr)


@pandas_udf(returnType=LongType())
def To32CRC(rows):
    return rows.apply(Get32CRC)



def Maxy_FtoS():
    Maxy_FtoS = {
        0x00010000|0x00000001 : 'WS_Start',
        0x00010000|0x00000002 : 'WS_Error',
        0x00010000|0x00000003 : 'WS_End',
        
        0x00020000|0x00000001 : 'WN_Start',
        0x00020000|0x00000002 : 'WN_Res',
        0x00020000|0x00000003 : 'WN_Finish', #화면 네이게이션 종료 131075
        0x00020000|0x00000004 : 'WN_Error',
        0x00020000|0x00000005 : 'WN_J_Error',
        0x00020000|0x00000006 : 'WN_Redirect',
        0x00020000|0x00000007 : 'WN_D_Start',
        0x00020000|0x00000008 : 'WN_D_Finish',
        0x00020000|0x00000009 : 'WN_SSL',
        0x00020000|0x00000010 : 'WN_Other',
        0x00020011 : 'WNav_Show_Load',
        0x00020012 : 'WNav_Show_Back',
        0x00020013 : 'WNav_Show_Refresh',
        0x00020014 : 'WNav_Show_Forward',
        0x00020015 : 'WNav_Show_Hide',
        0x00020016 : 'WNav_Show_Pushstate',
        0x00020017 : 'WNav_Show_Popstate',
        0x00020018 : 'WNav_Show_Unload',
        0x00020019 : 'WNav_Show_Hashchange',
        0x00020020 : 'WNav_Show_DocReadyStateChange',
        0x00020021 : 'WNav_Show_DoccontentLoad',
        0x00020022 : 'WNav_Login',
        0x00020023 : 'WNav_Logout',
        
        
        0x00040000|0x00000001 : 'Res_Inf',
        0x00040000|0x00000002 : 'Res_Start',
        0x00040000|0x00000003 : 'Res_End',
        0x00040000|0x00000004 : 'Res_Error',
        
        0x00080000|0x00000001 : 'HTTP_Req',
        0x00080000|0x00000002 : 'HTTP_Rep',
        0x00080000|0x00000003 : 'HTTP_Finish',
        0x00080000|0x00000004 : 'HTTP_Error',
        
        0x00100000|0x00000001 : 'Nat_Start',
        0x00100000|0x00000002 : 'Nat_End',
        0x00100000|0x00000003 : 'Nat_Error',
        0x00100000|0x00000004 : 'AppStart',
        0x00100000|0x00000005 : 'Foreground',
        0x00100000|0x00000006 : 'Background',
        0x00100000|0x00000007 : 'Terminate',
        0x00100000|0x00000008 : 'App_DeepLink',
        0x00100000|0x00000009 : 'App_NotResponse',
        
        
        0x00200000            : 'Crash',
        0x00400001            : 'Taggin',
        0x00400002            : 'Taggin_Error',
        0x00400003            : 'Taggin_Alarm',
        0x00800001            : 'XMLHttpRequest_Sumbit',
        0x00800002            : 'XMLHttpRequest_Open',
        0x00800003            : 'XMLHttpRequest_Send',
        0x00800004           : 'XMLHttpRequest_Response'
    }
    return Maxy_FtoS

def Maxy_StoF():
    Map = Maxy_FtoS()
    return { Map[a]: a for a in Map}



def list_year_months(date1, date2):
    # 날짜 순서 정렬
    if date1 > date2:
        date1, date2 = date2, date1
    
    # 시작 년, 월을 초기화하고 결과 리스트 생성
    year_months = []
    current_year, current_month = date1.year, date1.month
    
    # 두 날짜 사이의 모든 "년-월"을 리스트에 추가
    while current_year < date2.year or (current_year == date2.year and current_month <= date2.month):
        year_months.append(f"{current_year}-{current_month:02d}")
        # 월을 증가시키고, 년도와 월 계산을 조정
        current_month += 1
        if current_month > 12:
            current_month = 1
            current_year += 1
    
    return year_months


def list_year_month_days(start_date: datetime, end_date: datetime):
    # # timestamp를 datetime 형식으로 변환
    # start_date = datetime.fromtimestamp(start_timestamp)
    # end_date = datetime.fromtimestamp(end_timestamp)
    
    # 날짜 범위 리스트 생성
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(current_date.strftime('%Y-%m-%d'))
        current_date += timedelta(days=1)
    
    return dates

def unsigned_to_signed(unsigned_long):
    #opensearch의 url_key는 long type 이다. python 기본타입은 unsigned long이다. 이것을 변경해준다.
    if unsigned_long > 0x7FFFFFFFFFFFFFFF:
        return unsigned_long - 0x10000000000000000
    return unsigned_long