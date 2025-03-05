-- Terapi seansları tablosu
CREATE TABLE IF NOT EXISTS therapy_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    therapist_id INT NOT NULL,
    therapy_type_id INT NOT NULL,
    scenario_id INT,
    session_date DATETIME NOT NULL,
    anxiety_level_start INT,
    anxiety_level_end INT,
    success_rating INT,
    duration INT, -- dakika cinsinden
    cancelled BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES individual_clients(id),
    FOREIGN KEY (therapist_id) REFERENCES users(id),
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id),
    FOREIGN KEY (scenario_id) REFERENCES vr_scenarios(id)
);

-- Ödemeler tablosu
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    session_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_type ENUM('cash', 'credit_card', 'insurance', 'corporate') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES individual_clients(id),
    FOREIGN KEY (session_id) REFERENCES therapy_sessions(id)
);

-- VR senaryoları tablosu
CREATE TABLE IF NOT EXISTS vr_scenarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty_level INT,
    duration INT, -- dakika cinsinden
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İlerleme takibi tablosu
CREATE TABLE IF NOT EXISTS progress_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    session_id INT NOT NULL,
    phobia_type_id INT NOT NULL,
    anxiety_level INT,
    confidence_level INT,
    notes TEXT,
    tracked_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES individual_clients(id),
    FOREIGN KEY (session_id) REFERENCES therapy_sessions(id),
    FOREIGN KEY (phobia_type_id) REFERENCES phobia_types(id)
);
