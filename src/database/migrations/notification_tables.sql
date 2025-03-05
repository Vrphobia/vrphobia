-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    data JSON,
    read_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Push subscription tablosu
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    push_subscription JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_subscription (user_id, push_subscription(191)),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bildirim şablonları tablosu
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    data_template JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bildirim geçmişi tablosu
CREATE TABLE IF NOT EXISTS notification_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id INT NOT NULL,
    status ENUM('pending', 'sent', 'failed') NOT NULL,
    channel ENUM('email', 'sms', 'push') NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
);

-- Kullanıcı bildirim tercihleri için users tablosuna kolon ekleme
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSON DEFAULT NULL;
