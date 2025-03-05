-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    role ENUM('admin', 'therapist', 'client') NOT NULL,
    phone VARCHAR(20),
    client_number VARCHAR(8) UNIQUE, -- Format: YYYY1234
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Randevular tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    appointment_time DATETIME NOT NULL,
    duration INT NOT NULL, -- dakika cinsinden
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT,
    satisfaction_rating INT CHECK (satisfaction_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Ödeme tablosu
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    appointment_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATETIME NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    description TEXT,
    invoice_number VARCHAR(20) UNIQUE,
    payment_provider VARCHAR(50),
    transaction_id VARCHAR(100),
    invoice_path VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Aktivite log tablosu
CREATE TABLE IF NOT EXISTS activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSON,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin bildirim ayarları tablosu
CREATE TABLE IF NOT EXISTS admin_notification_settings (
    admin_id INT PRIMARY KEY,
    new_appointment_notification BOOLEAN DEFAULT TRUE,
    cancelled_appointment_notification BOOLEAN DEFAULT TRUE,
    payment_reminder_notification BOOLEAN DEFAULT TRUE,
    system_alert_notification BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Memnuniyet değerlendirme tablosu
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Randevu notları tablosu
CREATE TABLE IF NOT EXISTS appointment_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    therapist_id INT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Sistem bildirimleri tablosu
CREATE TABLE IF NOT EXISTS system_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('appointment', 'payment', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    recipient_id INT NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Fobi türleri tablosu
CREATE TABLE IF NOT EXISTS phobia_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Danışan fobi takibi tablosu
CREATE TABLE IF NOT EXISTS client_phobias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    phobia_type_id INT NOT NULL,
    severity_level INT NOT NULL CHECK (severity_level BETWEEN 1 AND 10),
    start_date DATE NOT NULL,
    last_evaluation_date DATE,
    status ENUM('active', 'in_progress', 'completed') NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (phobia_type_id) REFERENCES phobia_types(id)
);

-- Tedavi planları tablosu
CREATE TABLE IF NOT EXISTS treatment_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- VR senaryoları tablosu
CREATE TABLE IF NOT EXISTS vr_scenarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    phobia_type_id INT NOT NULL,
    difficulty_level INT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
    duration_minutes INT NOT NULL,
    success_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (phobia_type_id) REFERENCES phobia_types(id)
);

-- VR seans kayıtları tablosu
CREATE TABLE IF NOT EXISTS vr_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    scenario_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    completion_percentage INT CHECK (completion_percentage BETWEEN 0 AND 100),
    anxiety_level_start INT CHECK (anxiety_level_start BETWEEN 1 AND 10),
    anxiety_level_end INT CHECK (anxiety_level_end BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (scenario_id) REFERENCES vr_scenarios(id)
);

-- Mesajlar tablosu
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Dosyalar tablosu
CREATE TABLE IF NOT EXISTS files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(512) NOT NULL,
    type VARCHAR(50) NOT NULL,
    size INT NOT NULL,
    uploader_id INT NOT NULL,
    related_to ENUM('message', 'appointment', 'treatment_plan') NOT NULL,
    related_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- Terapist detayları tablosu
CREATE TABLE IF NOT EXISTS therapist_details (
    therapist_id INT PRIMARY KEY,
    specializations TEXT,
    certifications TEXT,
    education TEXT,
    experience_years INT,
    working_hours JSON, -- Haftalık çalışma saatleri
    max_clients INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- İki faktörlü kimlik doğrulama tablosu
CREATE TABLE IF NOT EXISTS two_factor_auth (
    user_id INT PRIMARY KEY,
    secret_key VARCHAR(32) NOT NULL,
    backup_codes JSON,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Audit log tablosu
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
