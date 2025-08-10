@echo off
REM 파일 업로드 배치 파일
REM 사용법: upload-files.bat [EC2_IP주소]

if "%1"=="" (
    echo EC2 IP 주소를 입력해주세요.
    echo 사용법: upload-files.bat YOUR_EC2_IP
    pause
    exit /b 1
)

set EC2_IP=%1
set KEY_FILE=C:\Users\c3dyg\Meire\meire.pem

echo 📤 서버 설정 파일 업로드 중...
echo 서버 IP: %EC2_IP%
echo.

REM 서버 설정 스크립트 업로드
echo [1/2] 서버 설정 스크립트 업로드...
scp -i "%KEY_FILE%" "server-setup.sh" ubuntu@%EC2_IP%:~/

REM 환경변수 템플릿 업로드
echo [2/2] 환경변수 템플릿 업로드...
scp -i "%KEY_FILE%" "production.env.example" ubuntu@%EC2_IP%:~/

echo.
echo ✅ 파일 업로드 완료!
echo 이제 SSH로 접속하여 설정을 진행하세요.
echo.

pause