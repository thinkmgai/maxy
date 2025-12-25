package com.thinkm.common.util;

import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import javax.crypto.Cipher;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

/**
 * RSA 암/복호화를 위한 유틸 클래스
 */
@Slf4j
public class RSAUtil {

    private static final String RSA_WEB_KEY = "_RSA_WEB_Key_";
    private static final String RSA_INSTANCE = "RSA";

    /**
     * rsa 공개키, 개인키 생성
     *
     * @param request HttpServletRequest
     */
    public void initRsa(HttpServletRequest request) {
        HttpSession session = request.getSession();

        KeyPairGenerator generator;
        try {
            generator = KeyPairGenerator.getInstance(RSA_INSTANCE);
            generator.initialize(1024);

            KeyPair keyPair = generator.genKeyPair();
            KeyFactory keyFactory = KeyFactory.getInstance(RSA_INSTANCE);
            PublicKey publicKey = keyPair.getPublic();
            PrivateKey privateKey = keyPair.getPrivate();

            session.setAttribute(RSA_WEB_KEY, privateKey); // session에 RSA 개인키를 세션에 저장

            RSAPublicKeySpec publicSpec = keyFactory.getKeySpec(publicKey, RSAPublicKeySpec.class);
            String publicKeyModulus = publicSpec.getModulus().toString(16);
            String publicKeyExponent = publicSpec.getPublicExponent().toString(16);

            request.setAttribute("RSAModulus", publicKeyModulus); // rsa modulus 를 request 에 추가
            request.setAttribute("RSAExponent", publicKeyExponent); // rsa exponent 를 request 에 추가
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 복호화
     *
     * @param privateKey   PrivateKey
     * @param securedValue String
     * @return decryptedValue
     */
    public String decryptRsa(PrivateKey privateKey, String securedValue) throws Exception {
        Cipher cipher = Cipher.getInstance(RSA_INSTANCE);
        byte[] encryptedBytes = hexToByteArray(securedValue);
        cipher.init(Cipher.DECRYPT_MODE, privateKey);
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
        return new String(decryptedBytes, StandardCharsets.UTF_8);
    }

    /**
     * 16진 문자열을 byte 배열로 변환한다.
     *
     * @param hex String
     * @return byte[]
     */
    private byte[] hexToByteArray(String hex) {
        if (hex == null || hex.length() % 2 != 0) {
            return new byte[]{};
        }

        byte[] bytes = new byte[hex.length() / 2];
        for (int i = 0; i < hex.length(); i += 2) {
            byte value = (byte) Integer.parseInt(hex.substring(i, i + 2), 16);
            bytes[(int) Math.floor((double) i / 2)] = value;
        }
        return bytes;
    }

    public String getRsaWebKey() {
        return RSA_WEB_KEY;
    }

}
