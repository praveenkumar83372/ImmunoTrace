/* ===============================
   STORAGE SYSTEM
   =============================== */
const getUsers = () => JSON.parse(localStorage.getItem("users")) || [];
const saveUsers = (u) => localStorage.setItem("users", JSON.stringify(u));
const getCurrentUser = () => JSON.parse(localStorage.getItem("currentUser"));
const setCurrentUser = (u) => localStorage.setItem("currentUser", JSON.stringify(u));

/* ===============================
   AUTH SYSTEM
   =============================== */
function signup(name, age, email, password) {
    let users = getUsers();
    if (users.find(u => u.email === email)) {
        alert("User already exists with this email!");
        return;
    }
    let user = {
        name, age, email, password,
        phone: "-",
        joined: new Date().toLocaleDateString('en-GB'),
        occupation: "-",
        reports: []
    };
    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    window.location.href = "index.html";
}

function login(email, password) {
    let user = getUsers().find(u => u.email === email && u.password === password);
    if (!user) {
        alert("Invalid Email or Password!");
        return;
    }
    setCurrentUser(user);
    window.location.href = "index.html";
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
}

/* ===============================
   DARK MODE
   =============================== */
function initTheme() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
}

/* ===============================
   SCAN SYSTEM (EXACT 25 SECONDS 🔥)
   =============================== */
let scanning = false;
let scanInterval;
let graphData = [];

async function startScan() {
    if (scanning) return;
    const status = localStorage.getItem("deviceStatus") || "offline";
    if (status === "offline") {
        alert("⚠ USB Sensor not detected. Please plugin hardware.");
        return;
    }
    runScan(false); 
}

function startSample() { 
    if (scanning) return;
    runScan(true); 
}

async function runScan(isSample) {
    scanning = true;
    const btn = isSample ? document.getElementById("sampleBtn") : document.getElementById("scanBtn");
    const statusText = document.getElementById("statusText");

    if (btn) { btn.innerText = "Scanning..."; btn.disabled = true; }
    if (statusText) statusText.innerText = isSample ? "Running Demo..." : "Reading Hardware...";

    let seconds = 0;
    let finalData = { heart: 0, spo2: 0, temp: 0 };
    let vitData = { vitA: "-", vitB: "-", vitC: "-", vitD: "-", calcium: "-", zinc: "-" };

    scanInterval = setInterval(async () => {
        if (isSample) {
            finalData.heart = Math.floor(Math.random() * 20) + 72;
            finalData.spo2 = Math.floor(Math.random() * 3) + 96;
            finalData.temp = (36.5 + Math.random()).toFixed(1);
            vitData = { 
                vitA: "Optimal", vitB: "Normal", vitC: "Good", 
                vitD: "Low", calcium: "Normal", zinc: "Optimal" 
            };
        } else {
            try {
                let res = await fetch("http://127.0.0.1:5000/get_data");
                let sensor = await res.json();
                finalData.heart = sensor.heart;
                finalData.spo2 = sensor.spo2;
                finalData.temp = sensor.temp;
                vitData = { vitA: "Normal", vitB: "Normal", vitC: "Normal", vitD: "Normal", calcium: "Normal", zinc: "Normal" };
            } catch (e) { console.error("Hardware disconnected"); }
        }

        updateUI("heart", finalData.heart + " BPM");
        updateUI("spo2", finalData.spo2 + "%");
        updateUI("temp", finalData.temp + "°C");
        for (let key in vitData) { updateUI(key, vitData[key]); }
        animateGraph(finalData.heart);

        seconds++;
        if (seconds >= 60) { 
            clearInterval(scanInterval);
            finishScan(finalData, vitData, isSample);
        }
    }, 1000);
}

function finishScan(data, vitamins, isSample) {
    scanning = false;
    ["scanBtn", "sampleBtn"].forEach(id => {
        let b = document.getElementById(id);
        if (b) { b.disabled = false; b.innerText = id.includes("scan") ? "Scan" : "Sample"; }
    });
    if (document.getElementById("statusText")) document.getElementById("statusText").innerText = "Completed";

    let user = getCurrentUser();
    if (!user) return;

    user.reports = user.reports || [];
    user.reports.push({
        date: isSample ? "Sample Demo" : new Date().toLocaleDateString('en-GB'),
        heart: data.heart,
        spo2: data.spo2,
        temp: data.temp,
        vitamins: vitamins,
        type: isSample ? "Simulation" : "Hardware"
    });

    setCurrentUser(user);
    let users = getUsers().map(u => u.email === user.email ? user : u);
    saveUsers(users);
    alert("✅ Analysis Complete. Report saved.");
}

/* ===============================
   FINAL CLINICAL PDF GENERATOR 🔥
   =============================== */
function generateMedicalReport(index) {
    let user = getCurrentUser();
    let r = user.reports[index];
    if (!r) return;

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();

    // 1. Header Branding
    doc.setFillColor(30, 27, 75); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26); doc.setFont("helvetica", "bold");
    doc.text("ImmunoTrace", 20, 22);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("AI-Powered Health Diagnostic Suite", 20, 31);
    doc.text("Clinical Simulation Prototype", 145, 22);

    // 2. Patient & Contact Block
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("PATIENT INFORMATION", 20, 55);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Full Name: ${user.name}`, 20, 65);
    doc.text(`Email ID: ${user.email}`, 20, 72);
    doc.text(`Age: ${user.age || "N/A"}`, 20, 79);
    
    doc.text(`Report Date: ${r.date}`, 130, 65);
    doc.text(`Scan Type: ${r.type}`, 130, 72);
    doc.text(`Report ID: IT-${Math.floor(100000 + Math.random() * 900000)}`, 130, 79);
    doc.line(20, 85, 190, 85);

    // 3. Vitals Table
    doc.setFont("helvetica", "bold"); doc.text("VITAL SIGNS ANALYSIS", 20, 95);
    doc.setFillColor(245, 245, 250); doc.rect(20, 100, 170, 8, 'F');
    doc.setFontSize(9);
    doc.text("Parameter", 25, 106); doc.text("Result", 90, 106); doc.text("Reference Status", 150, 106);

    let rows = [
        ["Heart Rate", `${r.heart} BPM`, r.heart > 100 || r.heart < 60 ? "Abnormal" : "Stable"],
        ["Blood Oxygen (SpO2)", `${r.spo2}%`, r.spo2 < 95 ? "Low" : "Optimal"],
        ["Body Temp", `${r.temp}°C`, r.temp > 37.5 ? "Elevated" : "Normal"]
    ];
    rows.forEach((row, i) => {
        let y = 115 + (i * 10);
        doc.setFont("helvetica", "normal");
        doc.text(row[0], 25, y); doc.text(row[1], 90, y);
        doc.setFont("helvetica", "bold"); doc.text(row[2], 145, y);
    });

    // 4. Nutritional Markers Section
    if (r.vitamins) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text("NUTRITIONAL & MINERAL MARKERS", 20, 155);
        let vList = [
            ["Vitamin A", r.vitamins.vitA], ["Vitamin B", r.vitamins.vitB],
            ["Vitamin C", r.vitamins.vitC], ["Vitamin D", r.vitamins.vitD],
            ["Calcium", r.vitamins.calcium], ["Zinc", r.vitamins.zinc]
        ];
        vList.forEach((v, i) => {
            let col = i % 2; let rowIdx = Math.floor(i / 2);
            let x = 20 + (col * 85); let y = 165 + (rowIdx * 12);
            doc.setFillColor(248, 248, 255); doc.roundedRect(x, y-5, 80, 10, 2, 2, 'F');
            doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.text(`${v[0]}:`, x + 5, y + 2);
            doc.setFont("helvetica", "normal"); doc.text(v[1], x + 40, y + 2);
        });
    }

    // 5. System Footer
    doc.setDrawColor(200, 200, 200); doc.line(20, 250, 190, 250);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("System Info & Contact:", 20, 258);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text("Software: ImmunoTrace Suite v2.0", 20, 264);
    doc.text("Institution: Dr. MGR Educational and Research Institute", 20, 269);
    
    doc.setFont("helvetica", "bold"); doc.setTextColor(0, 0, 0); doc.text("Team 404 Support:", 130, 258);
    doc.setFont("helvetica", "normal"); doc.text("Email: team404.mgr@gmail.com", 130, 264);
    doc.text("Helpline: +91 98765 43210", 130, 269);

    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
    doc.text("Disclaimer: Simulated report for monitoring only. Not a medical laboratory replacement.", 20, 280);

    doc.save(`ImmunoTrace_Report_${user.name.replace(/\s+/g, '_')}.pdf`);
}

/* ===============================
   UTILITIES & INIT
   =============================== */
function updateUI(id, val) {
    let el = document.getElementById(id);
    if (el) el.innerText = val;
}

function animateGraph(value) {
    let canvas = document.getElementById("graph");
    if (!canvas) return;
    let ctx = canvas.getContext("2d");
    graphData.push(value);
    if (graphData.length > 40) graphData.shift();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    graphData.forEach((v, i) => {
        let x = i * (canvas.width / 40);
        let y = canvas.height - (v * (canvas.height / 150));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2; ctx.stroke();
}

function loadReports() {
    let user = getCurrentUser();
    let box = document.getElementById("reportList");
    if (!box || !user?.reports) return;
    box.innerHTML = "";
    [...user.reports].reverse().forEach((r, i) => {
        let idx = user.reports.length - 1 - i;
        box.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid #ddd; margin-bottom:5px; background:rgba(0,0,0,0.02); border-radius:8px;">
            <span><b>${r.date}</b> (${r.type})</span>
            <button onclick="generateMedicalReport(${idx})" style="background:#6366f1; color:white; border-radius:6px; border:none; padding:6px 12px; cursor:pointer; font-size:13px;">Download PDF</button>
        </div>`;
    });
}

window.onload = () => {
    initTheme();
    setInterval(async () => {
        try {
            let res = await fetch("http://127.0.0.1:5000/status");
            let data = await res.json();
            localStorage.setItem("deviceStatus", data.status);
            if(document.getElementById("deviceStatus")) {
                document.getElementById("deviceStatus").innerText = "● " + data.status;
                document.getElementById("deviceStatus").style.color = data.status === "connected" ? "#22c55e" : "#ef4444";
            }
        } catch(e) {}
    }, 5000);
    if (document.getElementById("reportList")) loadReports();
};