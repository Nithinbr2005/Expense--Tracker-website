// Wait for the DOM to fully load before initializing our scripts
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('expense-form');
    const expensesBody = document.getElementById('expenses-body');
    const totalAmountEl = document.getElementById('total-amount');
    const filterCategory = document.getElementById('filter-category');
    const noExpensesMsg = document.getElementById('no-expenses-msg');
    const exportBtn = document.getElementById('export-csv');

    // Global state to store all fetched expenses
    let allExpenses = [];
    let expenseChartInstance = null;

    // Set today's date as default in the Date input field
    document.getElementById('date').valueAsDate = new Date();

    // Fetch and display initial expenses from backend when app loads
    fetchExpenses();

    // Event Listeners
    form.addEventListener('submit', handleAddExpense);
    filterCategory.addEventListener('change', renderExpenses); // Re-render when filter changes
    exportBtn.addEventListener('click', exportToCSV);

    /**
     * Fetch expenses from the Flask backend via API
     */
    async function fetchExpenses() {
        try {
            const response = await fetch('/expenses');
            if (!response.ok) throw new Error('Failed to fetch expenses');

            // Parse JSON response and store globally
            allExpenses = await response.json();

            // Render the table with the fetched data
            renderExpenses();
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    }

    /**
     * Handle adding a new expense when the form is submitted
     */
    async function handleAddExpense(e) {
        e.preventDefault(); // Prevent page reload

        // Gather data from the form
        const expenseData = {
            amount: document.getElementById('amount').value,
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            description: document.getElementById('description').value
        };

        try {
            // Send POST request with expense data
            const response = await fetch('/add_expense', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(expenseData)
            });

            if (!response.ok) throw new Error('Failed to add expense');

            // Reset form for next entry
            form.reset();
            // Reset date to today again
            document.getElementById('date').valueAsDate = new Date();

            // Refresh the expense list to show the new entry
            await fetchExpenses();

        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Could not add expense. Check your connection or the server state.');
        }
    }

    /**
     * Handle deleting an expense using its ID
     */
    async function deleteExpense(id) {
        // Confirm action with the user
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            // Send DELETE request to backend
            const response = await fetch(`/delete_expense/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete expense');

            // Refresh the expense list to remove the deleted entry
            await fetchExpenses();

        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Could not delete expense.');
        }
    }

    /**
     * Handle updating an expense
     */
    async function editExpense(id) {
        const expense = allExpenses.find(e => e.id == id);
        if (!expense) return;

        const newAmount = prompt('Enter new amount:', expense.amount);
        if (newAmount === null) return;

        const newCategory = prompt('Enter new category (Food, Transportation, Utilities, Entertainment, Shopping, Healthcare, Other):', expense.category);
        if (newCategory === null) return;

        const newDate = prompt('Enter new date (YYYY-MM-DD):', expense.date);
        if (newDate === null) return;

        const newDesc = prompt('Enter new description:', expense.description || '');
        if (newDesc === null) return;

        try {
            const response = await fetch(`/update_expense/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: newAmount,
                    category: newCategory,
                    date: newDate,
                    description: newDesc
                })
            });

            if (!response.ok) throw new Error('Failed to update expense');
            await fetchExpenses();
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Could not update expense.');
        }
    }

    /**
     * CSV Export
     */
    function exportToCSV() {
        if (allExpenses.length === 0) {
            alert('No expenses to export.');
            return;
        }

        const headers = ['Date', 'Category', 'Description', 'Amount'];
        const csvContent = [
            headers.join(','),
            ...allExpenses.map(e => [
                e.date,
                `"${e.category}"`,
                `"${e.description || ''}"`,
                e.amount
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `expenses_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Utility function to format numbers as US Currency
     */
    function formatMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Render the expenses table and update total amount
     */
    function renderExpenses() {
        // Apply current category filter
        const filterVal = filterCategory.value;
        let filtered = allExpenses;

        if (filterVal !== 'All') {
            filtered = allExpenses.filter(exp => exp.category === filterVal);
        }

        // Clear existing table body
        expensesBody.innerHTML = '';
        let total = 0;

        if (filtered.length === 0) {
            noExpensesMsg.classList.remove('hidden');
        } else {
            noExpensesMsg.classList.add('hidden');

            // Populate table with filtered expenses
            filtered.forEach((exp, index) => {
                total += parseFloat(exp.amount);

                const tr = document.createElement('tr');
                tr.className = 'fade-in';
                // Slight stagger effect for rows
                tr.style.animationDelay = `${index * 0.05}s`;

                // Format date to short concise string
                const dateObj = new Date(exp.date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                });

                // Build table row HTML
                tr.innerHTML = `
                    <td>${formattedDate}</td>
                    <td><span class="category-tag">${exp.category}</span></td>
                    <td style="color: var(--text-secondary)">${exp.description || '-'}</td>
                    <td class="amount-cell">${formatMoney(exp.amount)}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-edit" data-id="${exp.id}" title="Edit Expense">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn-delete" data-id="${exp.id}" title="Delete Expense">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;

                expensesBody.appendChild(tr);
            });

            // Attach event listeners to edit and delete buttons
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = this.getAttribute('data-id');
                    deleteExpense(id);
                });
            });

            document.querySelectorAll('.btn-edit').forEach(btn => {
                btn.addEventListener('click', function () {
                    const id = this.getAttribute('data-id');
                    editExpense(id);
                });
            });
        }

        // Update total to display sum of all expenses (not just filtered)
        const allTotal = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        totalAmountEl.textContent = formatMoney(allTotal);

        // Micro-animation for updating the total display
        totalAmountEl.style.transform = 'scale(1.1)';
        totalAmountEl.style.color = 'var(--accent-color)';
        setTimeout(() => {
            totalAmountEl.style.transform = 'scale(1)';
            totalAmountEl.style.color = 'var(--text-primary)';
            totalAmountEl.style.transition = 'all 0.3s ease';
        }, 200);

        // Update the visual dashboard summary and chart
        updateDashboard();
    }

    /**
     * Update the visual dashboard with Chart.js and Summary cards
     */
    function updateDashboard() {
        if (!expenseChartInstance) {
            const ctx = document.getElementById('expenseChart').getContext('2d');
            expenseChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'
                        ],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#f8fafc' }
                        }
                    }
                }
            });
        }

        // Calculate data
        const categoryTotals = {};
        let highestExp = null;

        allExpenses.forEach(exp => {
            const amt = parseFloat(exp.amount);
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;

            if (!highestExp || amt > parseFloat(highestExp.amount)) {
                highestExp = exp;
            }
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Update chart
        expenseChartInstance.data.labels = labels;
        expenseChartInstance.data.datasets[0].data = data;
        expenseChartInstance.update();

        // Update summary cards
        const highestEl = document.getElementById('highest-expense');
        const topCatEl = document.getElementById('top-category');

        if (highestExp) {
            highestEl.textContent = formatMoney(highestExp.amount);
        } else {
            highestEl.textContent = '-';
        }

        if (labels.length > 0) {
            const topCat = labels.reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b);
            topCatEl.textContent = topCat;
        } else {
            topCatEl.textContent = '-';
        }

        updateTrendChart();
    }

    let trendChartInstance = null;
    function updateTrendChart() {
        const trendCtx = document.getElementById('trendChart');
        if (!trendCtx) return;

        // Group expenses by date
        const dateTotals = {};
        allExpenses.forEach(exp => {
            const date = exp.date;
            dateTotals[date] = (dateTotals[date] || 0) + parseFloat(exp.amount);
        });

        // Sort dates
        const sortedDates = Object.keys(dateTotals).sort();
        const amounts = sortedDates.map(date => dateTotals[date]);

        if (!trendChartInstance) {
            trendChartInstance = new Chart(trendCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Daily Spending',
                        data: amounts,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        } else {
            trendChartInstance.data.labels = sortedDates;
            trendChartInstance.data.datasets[0].data = amounts;
            trendChartInstance.update();
        }
    }
});
