#!/bin/bash
# Meire Blog EC2 서버 설정 스크립트

echo "🚀 Meire Blog Server Setup Starting..."

# 시스템 업데이트
echo "📦 System Update..."
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS 설치
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 설치
echo "📦 Installing MySQL..."
sudo apt update
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql

# MySQL 보안 설정
echo "🔒 Configuring MySQL..."
sudo mysql -e "CREATE DATABASE meire_blog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'meire'@'localhost' IDENTIFIED BY 'meire2025!@#';"
sudo mysql -e "GRANT ALL PRIVILEGES ON meire_blog.* TO 'meire'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# PM2 설치 (프로세스 매니저)
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Nginx 설치 (리버스 프록시)
echo "📦 Installing Nginx..."
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Git 설치
echo "📦 Installing Git..."
sudo apt install git -y

# 방화벽 설정
echo "🔒 Configuring Firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Server setup completed!"
echo "🔑 MySQL Database: meire_blog"
echo "🔑 MySQL User: meire"
echo "🔑 MySQL Password: meire2025!@#"

# Node.js 및 NPM 버전 확인
echo "📊 Installed Versions:"
node --version
npm --version
mysql --version