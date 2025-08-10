@echo off
REM SSH 접속 배치 파일
REM 사용법: ssh-connect.bat [EC2_IP주소]

if "%1"=="" (
    echo EC2 IP 주소를 입력해주세요.
    echo 사용법: ssh-connect.bat YOUR_EC2_IP
    pause
    exit /b 1
)

set EC2_IP=%1
set KEY_FILE=C:\Users\c3dyg\Meire\meire.pem

echo 🔐 SSH로 EC2 서버 접속 중...
echo 서버 IP: %EC2_IP%
echo 키 파일: %KEY_FILE%
echo.

ssh -i "%KEY_FILE%" ubuntu@%EC2_IP%

pause