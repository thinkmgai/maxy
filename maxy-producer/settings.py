# 여러 Kafka 브로커 설정
# KafkaURL = ['maxy.thinkm.co.kr:9092']
# KafkaURL = ['192.168.10.177:19092']
# MaxyfiledbURL = "http://192.168.10.177:8887"


KafkaURL = ['192.168.10.170:19092']
MaxyfiledbURL = "http://192.168.10.170:8887"
    
#gunicorn으로 실행할 때는 사용하지 않음.
BindIP = '0.0.0.0'
Port   = 8085