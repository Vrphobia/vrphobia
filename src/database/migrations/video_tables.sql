-- Video görüşme odaları tablosu
CREATE TABLE IF NOT EXISTS video_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL UNIQUE,
    therapist_id INT NOT NULL,
    client_id INT NOT NULL,
    appointment_id INT,
    status ENUM('waiting', 'active', 'ended') NOT NULL DEFAULT 'waiting',
    started_at DATETIME,
    ended_at DATETIME,
    recording_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Video görüşme katılımcıları tablosu
CREATE TABLE IF NOT EXISTS video_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('therapist', 'client', 'supervisor') NOT NULL,
    joined_at DATETIME NOT NULL,
    left_at DATETIME,
    connection_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES video_rooms(room_id)
);

-- Video görüşme kayıtları tablosu
CREATE TABLE IF NOT EXISTS video_recordings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    duration INT, -- saniye cinsinden
    size BIGINT, -- byte cinsinden
    status ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES video_rooms(room_id)
);

-- Video görüşme olayları tablosu
CREATE TABLE IF NOT EXISTS video_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    event_type ENUM(
        'join',
        'leave',
        'camera_toggle',
        'mic_toggle',
        'screen_share_start',
        'screen_share_stop',
        'recording_start',
        'recording_stop',
        'connection_issue',
        'chat_message'
    ) NOT NULL,
    event_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES video_rooms(room_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Video görüşme ayarları tablosu
CREATE TABLE IF NOT EXISTS video_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    default_video_quality VARCHAR(20) DEFAULT '720p',
    auto_record BOOLEAN DEFAULT FALSE,
    preferred_camera VARCHAR(255),
    preferred_microphone VARCHAR(255),
    bandwidth_limit INT, -- Kbps cinsinden
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Video görüşme istatistikleri tablosu
CREATE TABLE IF NOT EXISTS video_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    bitrate INT, -- Kbps cinsinden
    packets_lost INT,
    round_trip_time INT, -- ms cinsinden
    jitter FLOAT,
    video_resolution VARCHAR(20),
    cpu_usage FLOAT,
    memory_usage FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES video_rooms(room_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
