document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            
            try {
                // Show loading state
                const submitButton = contactForm.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Gönderiliyor...';
                submitButton.disabled = true;

                console.log('Sending form data:', formData);

                // Send form data to backend
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Form submission failed');
                }

                console.log('Form submission successful:', data);

                // Show success message
                Swal.fire({
                    title: 'Başarılı!',
                    text: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
                    icon: 'success',
                    confirmButtonText: 'Tamam',
                    confirmButtonColor: '#0d6efd'
                });

                // Reset form
                contactForm.reset();
            } catch (error) {
                console.error('Error submitting form:', error);
                
                // Show error message
                Swal.fire({
                    title: 'Hata!',
                    text: 'Mesajınız gönderilirken bir hata oluştu: ' + error.message,
                    icon: 'error',
                    confirmButtonText: 'Tamam',
                    confirmButtonColor: '#0d6efd'
                });
            } finally {
                // Reset button state
                const submitButton = contactForm.querySelector('button[type="submit"]');
                submitButton.innerHTML = 'Gönder <i class="fas fa-paper-plane ms-2"></i>';
                submitButton.disabled = false;
            }
        });
    }
});
