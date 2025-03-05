-- Randevular tablosu
CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    therapy_type_id INT NOT NULL,
    appointment_time DATETIME NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id),
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id)
);

-- Terapist çalışma saatleri tablosu
CREATE TABLE IF NOT EXISTS therapist_working_hours (
    id INT PRIMARY KEY AUTO_INCREMENT,
    therapist_id INT NOT NULL,
    day_of_week TINYINT NOT NULL, -- 0 = Pazartesi, 6 = Pazar
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Randevu hatırlatmaları tablosu
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    reminder_type ENUM('email', 'sms') NOT NULL,
    reminder_time DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Tekrarlayan randevular tablosu
CREATE TABLE IF NOT EXISTS recurring_appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    therapy_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    day_of_week TINYINT NOT NULL,
    time TIME NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id),
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id)
);

-- İzin günleri tablosu
CREATE TABLE IF NOT EXISTS therapist_off_days (
    id INT PRIMARY KEY AUTO_INCREMENT,
    therapist_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Randevu geçmişi tablosu
CREATE TABLE IF NOT EXISTS appointment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id INT NOT NULL,
    action ENUM('created', 'updated', 'cancelled', 'completed', 'no_show') NOT NULL,
    action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action_by INT NOT NULL,
    notes TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (action_by) REFERENCES users(id)
);
