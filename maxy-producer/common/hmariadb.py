import mariadb
import pandas as pd
import numpy as np
import logging
logger = logging.getLogger('maxy')
def GetConnDB(host,port,userid,pwd,databse):
    '''
    데이터베이스 컨넥션 객체를 가져온다.
    '''
    try:
        conn = mariadb.connect(
            user=userid,
            password=pwd,
            host=host,
            port=port,
            database=databse
        )  
    except mariadb.Error as e:
        logger.error(f"Error connecting to MariaDB Platform: {e}")
        return None
    return conn

def ExcuteSQL(conn,sql,auttocmmit = True):
    '''
    DataBase Connection , Update,Insert
    '''
    with conn.cursor() as cursor:
        cursor.execute(sql)
    if auttocmmit:
        conn.commit()
    
def Commit(conn):
    conn.commit()
    
def Rollback(conn):
    conn.rollback()


def QueryToPandas(conn,sql):
    '''
    DataBase Connection을 통하여 Pandas DataFrame으로 리턴해준다.
    '''
    with conn.cursor() as cursor:
        cursor.execute(sql)
        col_names = []
        for i in range(0, len(cursor.description)):
            col_names.append(cursor.description[i][0].upper())
        data = pd.DataFrame(cursor.fetchall(),columns=col_names)
    return data

def QueryOne(conn,sql):
    '''
    DataBase Connection을 통하여 Pandas DataFrame으로 리턴해준다.
    '''
    with conn.cursor() as cursor:
        cursor.execute(sql)
        row = cursor.fetchone()
    return row

