-- İlerleme takibi ana tablosu
CREATE TABLE IF NOT EXISTS progress_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    session_id INT NOT NULL,
    phobia_type_id INT NOT NULL,
    anxiety_level INT NOT NULL, -- 1-10 arası
    confidence_level INT NOT NULL, -- 1-10 arası
    notes TEXT,
    tracked_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (session_id) REFERENCES therapy_sessions(id),
    FOREIGN KEY (phobia_type_id) REFERENCES phobia_types(id)
);

-- Danışan hedefleri tablosu
CREATE TABLE IF NOT EXISTS client_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    progress_id INT NOT NULL,
    description TEXT NOT NULL,
    target_date DATE,
    status ENUM('not_started', 'in_progress', 'completed', 'cancelled') NOT NULL,
    completion_notes TEXT,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (progress_id) REFERENCES progress_tracking(id)
);

-- Egzersiz sonuçları tablosu
CREATE TABLE IF NOT EXISTS exercise_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    progress_id INT NOT NULL,
    exercise_type VARCHAR(50) NOT NULL,
    completion_time INT, -- saniye cinsinden
    success_rate DECIMAL(5,2), -- yüzde olarak
    difficulty_level INT, -- 1-5 arası
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (progress_id) REFERENCES progress_tracking(id)
);

-- VR senaryoları tablosu
CREATE TABLE IF NOT EXISTS vr_scenarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level INT NOT NULL, -- 1-5 arası
    duration INT, -- dakika cinsinden
    category VARCHAR(50),
    prerequisites TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fobi seviyeleri geçmişi tablosu
CREATE TABLE IF NOT EXISTS phobia_level_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    phobia_type_id INT NOT NULL,
    severity_level INT NOT NULL, -- 1-10 arası
    assessment_date DATETIME NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (phobia_type_id) REFERENCES phobia_types(id)
);

-- Tedavi planı tablosu
CREATE TABLE IF NOT EXISTS treatment_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'completed', 'cancelled') NOT NULL,
    goals TEXT,
    treatment_approach TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id)
);

-- Tedavi planı aşamaları tablosu
CREATE TABLE IF NOT EXISTS treatment_plan_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_id INT NOT NULL,
    stage_number INT NOT NULL,
    description TEXT,
    expected_duration INT, -- gün cinsinden
    completion_criteria TEXT,
    status ENUM('not_started', 'in_progress', 'completed') NOT NULL,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES treatment_plans(id)
);
