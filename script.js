let registros = [];
    let myChart = null;

    function loadData() {
        const savedData = localStorage.getItem('waterData_v2');
        if (savedData) {
            registros = JSON.parse(savedData);
            registros.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        }
        setDefaultTime();
    }

    function setDefaultTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('fechaHora').value = now.toISOString().slice(0, 16);
    }

    function saveData() {
        localStorage.setItem('waterData_v2', JSON.stringify(registros));
    }

    loadData();

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        const buttons = document.querySelectorAll('.tab-btn');
        if(tabName === 'formulario') buttons[0].classList.add('active');
        else {
            buttons[1].classList.add('active');
            if(!document.getElementById('dateFilter').value) {
                filterChart('all', document.querySelectorAll('.filter-btn')[3]); 
            }
        }
    }

    document.getElementById('dataForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const nuevoRegistro = {
            fechaHora: document.getElementById('fechaHora').value,
            ph: parseFloat(document.getElementById('ph').value),
            temp: parseFloat(document.getElementById('temp').value),
            orp: parseFloat(document.getElementById('orp').value),
            ec: parseFloat(document.getElementById('ec').value),
            salinidad: parseFloat(document.getElementById('salinidad').value),
            sg: parseFloat(document.getElementById('sg').value),
            obs: document.getElementById('observaciones').value
        };
        registros.push(nuevoRegistro);
        registros.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        saveData();
        document.getElementById('dataForm').reset();
        setDefaultTime();
        alert('Datos guardados exitosamente.');
    });

    // --- CORRECCIÓN EN ESTA FUNCIÓN ---
    function downloadCSV() {
        if (registros.length === 0) {
            alert("No hay datos para exportar");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Fecha y Hora,pH,Temperatura,ORP,EC,Salinidad,S.G,Observaciones\n";
        
        registros.forEach(r => {
            // AQUI ESTA LA MAGIA: 
            // .replace(/[\r\n]+/g, " ") elimina los 'Enter' y los convierte en espacios
            let cleanObs = r.obs ? r.obs.replace(/,/g, " ").replace(/[\r\n]+/g, " ") : "";
            
            let row = `${r.fechaHora},${r.ph},${r.temp},${r.orp},${r.ec},${r.salinidad},${r.sg},${cleanObs}`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_calidad_agua.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function filterChart(range, btnElement) {
        document.getElementById('dateFilter').value = '';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        
        const now = new Date();
        let filteredData = [];
        if (range === 'all') {
            filteredData = registros;
        } else {
            const cutoff = new Date();
            if (range === '24h') cutoff.setHours(now.getHours() - 24);
            if (range === '7d') cutoff.setDate(now.getDate() - 7);
            if (range === '30d') cutoff.setDate(now.getDate() - 30);
            filteredData = registros.filter(r => new Date(r.fechaHora) >= cutoff);
        }
        updateChart(filteredData);
        renderTable(filteredData);
    }

    function filterBySpecificDate(dateString) {
        if(!dateString) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const filteredData = registros.filter(r => r.fechaHora.startsWith(dateString));
        updateChart(filteredData);
        renderTable(filteredData);
    }

    function renderTable(dataToShow) {
        const tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';
        if(dataToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay datos para este periodo</td></tr>';
            return;
        }
        const reversedData = [...dataToShow].reverse();
        reversedData.forEach(dato => {
            const dateObj = new Date(dato.fechaHora);
            const fechaStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const row = `<tr>
                <td style="font-size: 0.85em;">${fechaStr}</td>
                <td>${dato.ph}</td>
                <td>${dato.temp}</td>
                <td>${dato.orp}</td>
                <td>${dato.ec}</td>
                <td>${dato.salinidad}</td>
                <td>${dato.sg}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    function updateChart(dataToShow) {
        const ctx = document.getElementById('mainChart').getContext('2d');
        const labels = dataToShow.map(r => {
            const d = new Date(r.fechaHora);
            const isSingleDay = document.getElementById('dateFilter').value !== '';
            if(isSingleDay) {
                return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        });
        
        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'pH', data: dataToShow.map(r => r.ph), borderColor: '#ff6384', tension: 0.1 },
                    { label: 'Temp (°C)', data: dataToShow.map(r => r.temp), borderColor: '#36a2eb', tension: 0.1 },
                    { label: 'ORP (mV)', data: dataToShow.map(r => r.orp), borderColor: '#cc65fe', tension: 0.1, hidden: true },
                    { label: 'EC', data: dataToShow.map(r => r.ec), borderColor: '#ffce56', tension: 0.1 },
                    { label: 'Salinidad', data: dataToShow.map(r => r.salinidad), borderColor: '#4bc0c0', tension: 0.1 },
                    { label: 'S.G', data: dataToShow.map(r => r.sg), borderColor: '#9966ff', tension: 0.1, hidden: true }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { maxTicksLimit: 12 } },
                    y: { beginAtZero: false }
                }
            }
        });
    }

    function clearAllData() {
        if(confirm("¿Estás seguro de que quieres borrar TODO el historial?")) {
            localStorage.removeItem('waterData_v2');
            registros = [];
            filterChart('all', null);
            alert("Historial borrado.");
        }
    }