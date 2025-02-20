DROP DATABASE IF EXISTS employee_support_portal;
CREATE DATABASE employee_support_portal;
USE employee_support_portal;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'psychologist') NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS therapy_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('individual', 'child_teen', 'couple') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, surname, email, phone, role, password, is_active) VALUES 
('Tuğçe', 'Acar', 'tugce.acar@vrphobia.com', '5551234567', 'psychologist', '$2b$10$example_hash', 1),
('Selen', 'Çalışkan', 'selen.caliskan@vrphobia.com', '5557654321', 'psychologist', '$2b$10$example_hash', 1);

INSERT INTO therapy_types (name, description, category) VALUES
('Kedi Fobisi', 'Kedi fobisi (Ailurofobia) tedavisi', 'individual'),
('Uçuş Fobisi', 'Uçuş fobisi (Aerofobia) tedavisi', 'individual'),
('Çift Terapisi', 'Çiftler için terapi seansları', 'couple'),
('Çocuk-Ergen Terapisi', 'Çocuk ve ergenler için özel terapi seansları', 'child_teen');

CREATE TABLE IF NOT EXISTS therapist_specialties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    therapist_id INT NOT NULL,
    therapy_type_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id),
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id)
);

INSERT INTO therapist_specialties (therapist_id, therapy_type_id) VALUES 
(1, 1),  /* Tuğçe Acar - Kedi Fobisi */
(1, 2),  /* Tuğçe Acar - Uçuş Fobisi */
(1, 3),  /* Tuğçe Acar - Çift Terapisi */
(2, 4);  /* Selen Çalışkan - Çocuk-Ergen Terapisi */

CREATE TABLE IF NOT EXISTS organizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    contract_start_date DATE,
    contract_end_date DATE,
    sessions_per_client INT NOT NULL DEFAULT 6,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    client_type ENUM('individual', 'child_teen') NOT NULL,
    total_sessions INT NOT NULL DEFAULT 0,
    remaining_sessions INT NOT NULL DEFAULT 6,
    assigned_therapist_id INT NOT NULL,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (assigned_therapist_id) REFERENCES users(id)
);

INSERT INTO organizations (name, contact_person, phone, email, sessions_per_client) VALUES
('İpragaz', 'İletişim Sorumlusu', '5551112233', 'contact@ipragaz.com', 6);

CREATE TABLE IF NOT EXISTS individual_clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    therapy_type_id INT NOT NULL,
    assigned_therapist_id INT NOT NULL,
    total_sessions INT NOT NULL DEFAULT 0,
    total_payment DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id),
    FOREIGN KEY (assigned_therapist_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_type ENUM('organization', 'individual') NOT NULL,
    client_id INT NOT NULL,
    psychologist_id INT NOT NULL,
    therapy_type_id INT NOT NULL,
    appointment_time DATETIME NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    location VARCHAR(255),
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    completion_time DATETIME,
    completion_notes TEXT,
    payment_amount DECIMAL(10,2),
    payment_status ENUM('pending', 'paid', 'free') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (psychologist_id) REFERENCES users(id),
    FOREIGN KEY (therapy_type_id) REFERENCES therapy_types(id)
);

CREATE TABLE IF NOT EXISTS excel_import_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'failed', 'partial') NOT NULL,
    error_message TEXT,
    rows_processed INT NOT NULL DEFAULT 0,
    rows_failed INT NOT NULL DEFAULT 0
);
