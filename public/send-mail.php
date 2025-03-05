<?php
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Form verilerini al
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $phone = $_POST['phone'] ?? '';
    $company = $_POST['company'] ?? '';
    $message = $_POST['message'] ?? '';
    
    // E-posta içeriğini hazırla
    $to = "kurumsal@vrphobia.net";
    $subject = "Yeni İletişim Formu Mesajı - VR Phobia";
    
    $email_content = "
    <html>
    <head>
        <title>Yeni İletişim Formu Mesajı</title>
    </head>
    <body>
        <h2>Yeni İletişim Formu Mesajı</h2>
        <table>
            <tr><td><strong>İsim:</strong></td><td>$name</td></tr>
            <tr><td><strong>E-posta:</strong></td><td>$email</td></tr>
            <tr><td><strong>Telefon:</strong></td><td>$phone</td></tr>
            <tr><td><strong>Şirket:</strong></td><td>$company</td></tr>
            <tr><td><strong>Mesaj:</strong></td><td>$message</td></tr>
        </table>
    </body>
    </html>
    ";
    
    // E-posta başlıklarını ayarla
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: VR Phobia İletişim Formu <kurumsal@vrphobia.net>\r\n";
    $headers .= "Reply-To: $email\r\n";
    
    // E-postayı gönder
    if(mail($to, $subject, $email_content, $headers)) {
        echo json_encode([
            "success" => true,
            "message" => "Mesajınız başarıyla gönderildi."
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Mesaj gönderilirken bir hata oluştu."
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Geçersiz istek yöntemi."
    ]);
}
?>
