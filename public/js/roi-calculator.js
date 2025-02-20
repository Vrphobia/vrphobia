document.addEventListener('DOMContentLoaded', function() {
    const roiCalculator = document.getElementById('roiCalculator');
    const roiResult = document.getElementById('roiResult');

    if (roiCalculator) {
        roiCalculator.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get input values
            const employeeCount = parseFloat(document.getElementById('employeeCount').value);
            const averageSalary = parseFloat(document.getElementById('averageSalary').value);
            const absentDays = parseFloat(document.getElementById('absentDays').value);
            const turnoverRate = parseFloat(document.getElementById('turnoverRate').value);

            // Calculate savings
            const workDaysPerYear = 251; // Average work days in Turkey
            const dailyRate = averageSalary / workDaysPerYear;
            
            // Productivity increase (25% improvement)
            const productivitySavings = employeeCount * averageSalary * 0.25;

            // Absence reduction (40% reduction in absent days)
            const absenceSavings = employeeCount * dailyRate * absentDays * 0.4;

            // Total savings
            const totalSavings = productivitySavings + absenceSavings;

            // Update UI
            document.querySelector('.savings-productivity').textContent = 
                '₺' + productivitySavings.toLocaleString('tr-TR', {maximumFractionDigits: 0});
            document.querySelector('.savings-absence').textContent = 
                '₺' + absenceSavings.toLocaleString('tr-TR', {maximumFractionDigits: 0});
            document.querySelector('.savings-total').textContent = 
                '₺' + totalSavings.toLocaleString('tr-TR', {maximumFractionDigits: 0});

            // Show results
            roiResult.style.display = 'block';
        });
    }
});
