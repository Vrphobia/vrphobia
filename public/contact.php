<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST['name'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $company = $_POST['company'];
    $message = $_POST['message'];
    
    $to = "kurumsal@vrphobia.net";
    $subject = "Yeni İletişim Formu Mesajı";
    
    $message_body = "İsim: " . $name . "\n" .
                   "E-posta: " . $email . "\n" .
                   "Telefon: " . $phone . "\n" .
                   "Şirket: " . $company . "\n" .
                   "Mesaj: " . $message;
    
    $headers = "From: kurumsal@vrphobia.net";
    
    if(mail($to, $subject, $message_body, $headers)) {
        echo json_encode(["success" => true, "message" => "Mesajınız başarıyla gönderildi."]);
    } else {
        echo json_encode(["success" => false, "message" => "Mesaj gönderilirken bir hata oluştu."]);
    }
}
?>
