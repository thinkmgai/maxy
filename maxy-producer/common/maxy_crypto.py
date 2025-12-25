import base64
from Crypto import Random
from Crypto.Cipher import AES
import hashlib
import zlib
# https://umbum.dev/268
class AES128Crypto:
    def __init__(self, encrypt_key):
        self.BS = AES.block_size
        ##암호화 키중 16자리만 잘라서 쓴다.
        self.encrypt_key = encrypt_key[:16].encode(encoding='utf-8', errors='strict')
        self.pad = lambda s: bytes(s + (self.BS - len(s) % self.BS) * chr(self.BS - len(s) % self.BS), 'utf-8')
        self.unpad = lambda s: s[0:-ord(s[-1:])]

    def encrypt(self, raw):
        raw = self.pad(raw)
        # initialization vector 를 매번 랜덤으로 생성 한다.
        # iv = Random.new().read(self.BS)
        iv = bytes(16)   
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)

        # 암호화시 앞에 iv와 암화화 값을 붙여 인코딩 한다.
        # 디코딩시 앞에서 BS(block_size) 만금 잘라서 iv를 구하고, 이를통해 복호화 한다.
        return base64.b64encode(cipher.encrypt(raw)).decode("utf-8")

    def decrypt(self, enc):
        iv = bytes(16)   
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)
        try:
            result = self.unpad(cipher.decrypt(base64.b64decode(enc)))
        except Exception as e:
            result = self.unpad(cipher.decrypt(base64.b64decode(enc)))
            
        return zlib.decompress(result).decode('utf-8')
    
    def decryptbyte(self, enc):
        iv = bytes(16)   
        cipher = AES.new(self.encrypt_key, AES.MODE_CBC, iv)
        enc = self.unpad(cipher.decrypt(base64.b64decode(enc)))
        return zlib.decompress(enc)
    
    
    
class AESCipher(object):

    def __init__(self, key): 
        self.bs = AES.block_size
        self.key = hashlib.sha256(key.encode()).digest()

    def encrypt(self, raw):
        raw = self._pad(raw)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return base64.b64encode(iv + cipher.encrypt(raw.encode()))

    def decrypt(self, enc):
        enc = base64.b64decode(enc)
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

    def _pad(self, s):
        return s + (self.bs - len(s) % self.bs) * chr(self.bs - len(s) % self.bs)

    @staticmethod
    def _unpad(s):
        return s[:-ord(s[len(s)-1:])]