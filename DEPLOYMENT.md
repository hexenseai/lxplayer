# LXPlayer Ubuntu Deployment Guide

Bu rehber LXPlayer projesini Ubuntu sunucuya hızlıca kurmanızı sağlar.

## 🚀 Hızlı Kurulum (Önerilen)

### 1. Sunucu Hazırlığı

Ubuntu sunucunuza SSH ile bağlanın ve şu komutu çalıştırın:

```bash
# Kurulum scriptini indirin ve çalıştırın
curl -fsSL https://raw.githubusercontent.com/your-repo/lxplayer/main/deploy.sh | bash
```

### 2. Proje Dosyalarını Kopyalama

Yerel makinenizden proje dosyalarını sunucuya kopyalayın:

```bash
# Hızlı deployment scripti kullanarak
./quick-deploy.sh <sunucu-ip> <kullanıcı-adı>

# Örnek:
./quick-deploy.sh 192.168.1.100 ubuntu
```

### 3. Environment Ayarları

Production ortamı için `.env` dosyasını güncelleyin:

```bash
# Sunucuda
sudo nano /opt/lxplayer/.env
```

Önemli ayarlar:
- `SECRET_KEY`: Güvenli bir rastgele string
- `DATABASE_URL`: Veritabanı bağlantısı
- `MINIO_ACCESS_KEY` ve `MINIO_SECRET_KEY`: MinIO kimlik bilgileri

### 4. Servisi Başlatma

```bash
# Servisi başlatın
sudo systemctl start lxplayer

# Durumu kontrol edin
sudo systemctl status lxplayer

# Otomatik başlatmayı etkinleştirin
sudo systemctl enable lxplayer
```

## 📋 Manuel Kurulum

### Gereksinimler

- Ubuntu 20.04+ veya 22.04+
- En az 4GB RAM
- En az 20GB disk alanı
- Docker ve Docker Compose

### Adım Adım Kurulum

#### 1. Sistem Güncellemesi

```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Docker Kurulumu

```bash
# Docker repository ekleme
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker kurulumu
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Kullanıcıyı docker grubuna ekleme
sudo usermod -aG docker $USER
```

#### 3. Proje Kurulumu

```bash
# Proje dizini oluşturma
sudo mkdir -p /opt/lxplayer
sudo chown $USER:$USER /opt/lxplayer

# Proje dosyalarını kopyalama
# (Yerel makinenizden rsync veya scp ile)

# Environment dosyası oluşturma
cp env.production.template /opt/lxplayer/.env
nano /opt/lxplayer/.env
```

#### 4. Docker Compose ile Başlatma

```bash
cd /opt/lxplayer
docker-compose up -d
```

## 🔧 Yapılandırma

### Nginx Reverse Proxy

Nginx zaten kurulum scripti tarafından yapılandırılır. Manuel yapılandırma için:

```bash
sudo nano /etc/nginx/sites-available/lxplayer
```

### SSL Sertifikası (Let's Encrypt)

```bash
# Certbot kurulumu
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası alma
sudo certbot --nginx -d your-domain.com

# Otomatik yenileme
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Ayarları

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
```

## 📊 Monitoring ve Logging

### Servis Durumu

```bash
# Servis durumu
sudo systemctl status lxplayer

# Docker container durumu
docker ps

# Sistem kaynakları
htop
```

### Logları Görüntüleme

```bash
# Systemd logları
sudo journalctl -u lxplayer -f

# Docker logları
docker-compose logs -f

# Belirli servis logları
docker-compose logs -f api
docker-compose logs -f web
```

### Backup

```bash
# Veritabanı backup
docker exec postgres pg_dump -U postgres lxplayer > backup.sql

# MinIO backup
docker exec minio mc mirror /data /backup

# Tüm verileri backup
tar -czf lxplayer-backup-$(date +%Y%m%d).tar.gz /opt/lxplayer
```

## 🚨 Troubleshooting

### Yaygın Sorunlar

#### 1. Port Çakışması

```bash
# Kullanılan portları kontrol edin
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000
```

#### 2. Docker Permission Hatası

```bash
# Kullanıcıyı docker grubuna ekleyin
sudo usermod -aG docker $USER
# Sistemi yeniden başlatın veya oturumu kapatıp açın
```

#### 3. Disk Alanı Sorunu

```bash
# Disk kullanımını kontrol edin
df -h
docker system prune -a
```

#### 4. Memory Sorunu

```bash
# Memory kullanımını kontrol edin
free -h
docker stats
```

### Servis Yeniden Başlatma

```bash
# Tüm servisleri yeniden başlatma
sudo systemctl restart lxplayer

# Sadece Docker container'ları
docker-compose restart

# Belirli servis
docker-compose restart api
```

## 🔄 Güncelleme

### Otomatik Güncelleme

```bash
# Proje dosyalarını güncelleme
cd /opt/lxplayer
git pull origin main

# Docker image'larını yeniden build etme
docker-compose build --no-cache

# Servisleri yeniden başlatma
docker-compose up -d
```

### Manuel Güncelleme

```bash
# Servisleri durdurma
docker-compose down

# Yeni kodları kopyalama
# (rsync veya git pull ile)

# Yeniden build ve başlatma
docker-compose build
docker-compose up -d
```

## 📞 Destek

Sorun yaşarsanız:

1. Logları kontrol edin: `sudo journalctl -u lxplayer -f`
2. Docker durumunu kontrol edin: `docker ps`
3. Sistem kaynaklarını kontrol edin: `htop`
4. Network bağlantısını test edin: `curl http://localhost:3000`

## 🔐 Güvenlik Notları

- Production ortamında mutlaka güçlü şifreler kullanın
- Firewall'u etkinleştirin
- SSL sertifikası kullanın
- Düzenli backup alın
- Sistem güncellemelerini takip edin
- Docker image'larını güncel tutun
