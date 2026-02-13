   // --- VARIABLES ---
    let registros = [];
    let currentFilteredData = [];
    let mainChartInstance = null;
    let gaugeInstances = { ph: null, temp: null, orp: null };

    // Valores máximos visuales (para pintar las barras de progreso)
    const VISUAL_MAX = { ph: 14, temp: 40, orp: 600, ec: 5, salinidad: 40 };

    function init() {
        loadData();
        initGauges();
        if(registros.length > 0) {
            updateDashboard(registros); 
        }
    }

    function loadData() {
        const saved = localStorage.getItem('waterData_v3');
        if (saved) {
            registros = JSON.parse(saved);
            registros.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        }
        currentFilteredData = [...registros];
        setDefaultTime();
    }

    function saveData() {
        localStorage.setItem('waterData_v3', JSON.stringify(registros));
    }

    function setDefaultTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('fechaHora').value = now.toISOString().slice(0, 16);
    }

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        const btns = document.querySelectorAll('.tab-btn');
        if(tabName === 'formulario') btns[0].classList.add('active');
        else {
            btns[1].classList.add('active');
            setTimeout(() => updateMainChartDisplay(), 100); 
        }
    }

    document.getElementById('dataForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            fechaHora: document.getElementById('fechaHora').value,
            ph: parseFloat(document.getElementById('ph').value),
            temp: parseFloat(document.getElementById('temp').value),
            orp: parseFloat(document.getElementById('orp').value),
            ec: parseFloat(document.getElementById('ec').value),
            salinidad: parseFloat(document.getElementById('salinidad').value),
            sg: parseFloat(document.getElementById('sg').value),
            obs: document.getElementById('observaciones').value
        };
        registros.push(data);
        registros.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        saveData();
        
        document.getElementById('dataForm').reset();
        setDefaultTime();
        alert('Datos guardados.');
        
        // Refrescar con todo
        currentFilteredData = [...registros];
        updateDashboard(registros);
    });

    // --- DASHBOARD CENTRAL ---
    function updateDashboard(data) {
        // 1. Gauges (Ahora calculan el PROMEDIO de la data filtrada)
        updateGauges(data);

        // 2. Tabla
        renderTable(data);

        // 3. Gráfica
        updateMainChartDisplay();
    }

    // --- FILTROS ---
    function applyTimeFilter(range, btn) {
        document.getElementById('dateFilter').value = '';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');

        const now = new Date();
        if (range === 'all') {
            currentFilteredData = registros;
        } else {
            const cutoff = new Date();
            if (range === '24h') cutoff.setHours(now.getHours() - 24);
            if (range === '7d') cutoff.setDate(now.getDate() - 7);
            currentFilteredData = registros.filter(r => new Date(r.fechaHora) >= cutoff);
        }
        
        // ¡IMPORTANTE! Aquí actualizamos todo el dashboard con la data filtrada
        updateDashboard(currentFilteredData);
    }

    function applyDateFilter(dateVal) {
        if(!dateVal) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        currentFilteredData = registros.filter(r => r.fechaHora.startsWith(dateVal));
        updateDashboard(currentFilteredData);
    }

    // --- GAUGES CON PROMEDIOS ---
    function initGauges() {
        const commonOptions = {
            rotation: -90,
            circumference: 180,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            aspectRatio: 1.5
        };

        const createGauge = (ctxId, color) => new Chart(document.getElementById(ctxId), {
            type: 'doughnut',
            data: { datasets: [{ data: [0, 100], backgroundColor: [color, '#e2e8f0'], borderWidth: 0 }] },
            options: commonOptions
        });

        gaugeInstances.ph = createGauge('gaugePH', '#3b82f6');
        gaugeInstances.temp = createGauge('gaugeTemp', '#f97316');
        gaugeInstances.orp = createGauge('gaugeORP', '#a855f7');
    }

    function updateGauges(dataArray) {
        // Si no hay datos, ponemos ceros y salimos
        if(!dataArray || dataArray.length === 0) {
            document.getElementById('valPH').innerText = "--";
            document.getElementById('valTemp').innerText = "--";
            document.getElementById('valORP').innerText = "--";
            updateDoughnut(gaugeInstances.ph, 0, 14);
            updateDoughnut(gaugeInstances.temp, 0, 50);
            updateDoughnut(gaugeInstances.orp, 0, 600);
            return;
        }
        
        // CALCULAR PROMEDIOS
        let sumPH = 0, sumTemp = 0, sumORP = 0;
        dataArray.forEach(d => {
            sumPH += d.ph;
            sumTemp += d.temp;
            sumORP += d.orp;
        });

        const avgPH = (sumPH / dataArray.length).toFixed(2); // 2 decimales
        const avgTemp = (sumTemp / dataArray.length).toFixed(1); // 1 decimal
        const avgORP = Math.round(sumORP / dataArray.length); // Sin decimales

        // Actualizar Textos
        document.getElementById('valPH').innerText = avgPH;
        document.getElementById('valTemp').innerText = avgTemp + "°";
        document.getElementById('valORP').innerText = avgORP;

        // Actualizar Gráficos
        updateDoughnut(gaugeInstances.ph, avgPH, VISUAL_MAX.ph);
        updateDoughnut(gaugeInstances.temp, avgTemp, VISUAL_MAX.temp);
        updateDoughnut(gaugeInstances.orp, avgORP, VISUAL_MAX.orp);
    }

    function updateDoughnut(chart, val, max) {
        let percentage = (val / max) * 100;
        if(percentage > 100) percentage = 100;
        if(percentage < 0) percentage = 0;
        chart.data.datasets[0].data = [percentage, 100 - percentage];
        chart.update();
    }

    // --- GRÁFICAS ---
    function updateMainChartDisplay() {
        const ctx = document.getElementById('mainChart').getContext('2d');
        const type = document.getElementById('chartTypeSelector').value;
        const data = currentFilteredData;

        if (mainChartInstance) mainChartInstance.destroy();

        // 1. LÍNEA
        if (type === 'line') {
            mainChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(r => {
                        const d = new Date(r.fechaHora);
                        return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + (data.length > 20 ? `\n${d.getDate()}/${d.getMonth()+1}` : '');
                    }),
                    datasets: [
                        { label: 'pH', data: data.map(r => r.ph), borderColor: '#3b82f6', tension: 0.3 },
                        { label: 'Temp', data: data.map(r => r.temp), borderColor: '#f97316', tension: 0.3 },
                        { label: 'ORP', data: data.map(r => r.orp), borderColor: '#a855f7', hidden: true },
                        { label: 'Salinidad', data: data.map(r => r.salinidad), borderColor: '#10b981' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 2. RADAR - También usando PROMEDIOS
        else if (type === 'radar') {
            if (data.length === 0) return;

            // Calcular promedios para el radar
            let sums = {ph:0, temp:0, orp:0, ec:0, sal:0};
            data.forEach(d => {
                sums.ph += d.ph; sums.temp += d.temp; sums.orp += d.orp; sums.ec += d.ec; sums.sal += d.salinidad;
            });
            const len = data.length;
            
            // Normalizamos al 100%
            const normalizedData = [
                ((sums.ph/len) / VISUAL_MAX.ph) * 100,
                ((sums.temp/len) / VISUAL_MAX.temp) * 100,
                ((sums.orp/len) / VISUAL_MAX.orp) * 100,
                ((sums.ec/len) / VISUAL_MAX.ec) * 100,
                ((sums.sal/len) / VISUAL_MAX.salinidad) * 100
            ];

            mainChartInstance = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['pH', 'Temp', 'ORP', 'EC', 'Salinidad'],
                    datasets: [{
                        label: 'Promedio del Periodo (%)',
                        data: normalizedData,
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        borderColor: '#2563eb',
                        pointBackgroundColor: '#2563eb'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    // Mostrar el valor real promedio
                                    const rawVal = [sums.ph/len, sums.temp/len, sums.orp/len, sums.ec/len, sums.sal/len][context.dataIndex];
                                    return `${context.label}: ${rawVal.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 3. SCATTER
        else if (type === 'scatter') {
            mainChartInstance = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Correlación Temp (X) vs pH (Y)',
                        data: data.map(r => ({ x: r.temp, y: r.ph })),
                        backgroundColor: '#dc2626'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'Temperatura (°C)' } },
                        y: { title: { display: true, text: 'pH' } }
                    }
                }
            });
        }
    }

    function renderTable(data) {
        const tbody = document.querySelector('#historyTable tbody');
        tbody.innerHTML = '';
        if(data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay datos en este rango</td></tr>';
            return;
        }
        [...data].reverse().forEach(r => {
            const d = new Date(r.fechaHora);
            const row = `<tr>
                <td>${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                <td>${r.ph}</td><td>${r.temp}</td><td>${r.orp}</td><td>${r.ec}</td><td>${r.salinidad}</td><td>${r.sg}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    function downloadCSV() {
        if (registros.length === 0) return alert("Sin datos");
        let csv = "Fecha,pH,Temp,ORP,EC,Salinidad,SG,Observaciones\n";
        registros.forEach(r => {
            let obs = r.obs ? r.obs.replace(/,/g, " ").replace(/[\r\n]+/g, " ") : "";
            csv += `${r.fechaHora},${r.ph},${r.temp},${r.orp},${r.ec},${r.salinidad},${r.sg},${obs}\n`;
        });
        const link = document.createElement("a");
        link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
        link.download = "reporte_agua.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function clearAllData() {
        if(confirm("¿Borrar TODO?")) {
            localStorage.removeItem('waterData_v3');
            registros = [];
            currentFilteredData = [];
            init(); 
        }
    }

    init();