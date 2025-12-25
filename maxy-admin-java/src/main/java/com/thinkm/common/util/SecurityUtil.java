package com.thinkm.common.util;

import com.thinkm.common.code.ReturnCode;
import com.thinkm.common.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.AlgorithmParameterSpec;
import java.util.HashMap;

@Slf4j
@Component
public class SecurityUtil {

    private static final byte[] IV_BYTES = {
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00
    };
    //    private static final String KEY = PropertyLoader.getInstance().get("security.key.256");
    private static final HashMap<String, SecretKeySpec> KEY_STORE = new HashMap<>();
    @Value("${security.key}")
    private String KEY;

    public static String SHA256Encrypt(String str) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.update(str.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(md.digest());
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder builder = new StringBuilder();
        for (byte b : bytes) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }

    /**
     * 비밀번호 초기화
     * 초기 비밀번호
     * user id 3자리 + MMdd(RegDt) + !@ -> 총 9자리
     * user id 가 3자리 이하인 경우 a 문자로 빈자리 채움
     */
    public static String makeResetPw(String userId, String regDt) {
        if (userId.length() < 4 || regDt.length() < 8) {
            throw new BadRequestException(ReturnCode.ERR_WRONG_PARAMS);
        }

        return userId.substring(0, 3) + regDt.substring(4, 8) + "!@";
    }

    protected SecretKeySpec getKeySpec() {
        synchronized (KEY_STORE) {
            return KEY_STORE.computeIfAbsent(KEY, k -> new SecretKeySpec(k.getBytes(StandardCharsets.UTF_8), "AES"));
        }
    }

    /**
     * AES 128 Decrypt
     *
     * @param encryptedString encryptedString
     * @return String
     */
    public String AES128Decrypt(String encryptedString) throws Exception {
        try {
            if (encryptedString == null || "".equalsIgnoreCase(encryptedString)) {
                return "";
            }
            byte[] textBytes = Base64.decodeBase64(encryptedString);
            byte[] result = AES128Decrypt(textBytes);

            assert result != null;
            return new String(result, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new Exception(e.getMessage());
        }
    }

    /**
     * AES 128 Encrypt
     *
     * @param str str
     * @return String
     */
    public String AES128Encrypt(String str) throws Exception {
        try {
            if (str == null || "".equalsIgnoreCase(str)) {
                return "";
            }
            byte[] textBytes = str.getBytes(StandardCharsets.UTF_8);
            byte[] result = AES128Encrypt(textBytes);

            return Base64.encodeBase64String(result);
        } catch (Exception e) {
            throw new Exception(e.getMessage());
        }
    }

    private byte[] AES128Encrypt(byte[] encryptedBytes) throws Exception {
        try {
            AlgorithmParameterSpec ivSpec = new IvParameterSpec(IV_BYTES);
            SecretKeySpec newKey = getKeySpec();
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, newKey, ivSpec);
            return cipher.doFinal(encryptedBytes);
        } catch (Exception e) {
            throw new Exception(e.getMessage());
        }
    }

    private byte[] AES128Decrypt(byte[] encryptedBytes) throws Exception {
        try {
            AlgorithmParameterSpec ivSpec = new IvParameterSpec(IV_BYTES);
            SecretKeySpec newKey = getKeySpec();
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, newKey, ivSpec);
            return cipher.doFinal(encryptedBytes);
        } catch (Exception e) {
            throw new Exception(e.getMessage());
        }
    }
}
