// ========== DATA STORAGE ==========
let guests = JSON.parse(localStorage.getItem('guests')) || [];
let reservations = JSON.parse(localStorage.getItem('reservations')) || [];
let rooms = JSON.parse(localStorage.getItem('rooms')) || [];
let payments = JSON.parse(localStorage.getItem('payments')) || [];

// ========== ⚙️ ROOM TYPE CONFIG — SAVED IN STORAGE ==========
let roomTypeConfig = JSON.parse(localStorage.getItem('roomTypeConfig')) || {
    Standard: { price: 1800, totalRooms: 5 },
    Deluxe: { price: 3200, totalRooms: 4 },
    Suite: { price: 5500, totalRooms: 2 },
    Family: { price: 4000, totalRooms: 3 }
};

function saveConfig() {
    localStorage.setItem('roomTypeConfig', JSON.stringify(roomTypeConfig));
}

function saveData() {
    localStorage.setItem('guests', JSON.stringify(guests));
    localStorage.setItem('reservations', JSON.stringify(reservations));
    localStorage.setItem('rooms', JSON.stringify(rooms));
    localStorage.setItem('payments', JSON.stringify(payments));
}

// ========== TABS NAVIGATION ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        updateDropdowns();
        updateStats();
        updateAvailabilityDisplay();
        renderSettingsInputs();
    });
});

// ========== GUEST MODULE ==========
document.getElementById('guestForm').addEventListener('submit', e => {
    e.preventDefault();
    const guest = {
        id: Date.now(),
        name: document.getElementById('guestName').value,
        contact: document.getElementById('guestContact').value,
        email: document.getElementById('guestEmail').value,
        idNum: document.getElementById('guestId').value,
        address: document.getElementById('guestAddress').value
    };
    guests.push(guest);
    saveData(); renderGuests(); e.target.reset();
});

function renderGuests() {
    const list = document.getElementById('guestList');
    list.innerHTML = guests.map((g, i) => `
        <tr>
            <td>${i+1}</td>
            <td>${g.name}</td>
            <td>${g.contact}</td>
            <td>${g.email || '-'}</td>
            <td><button class="btn danger" onclick="deleteGuest(${g.id})">Delete</button></td>
        </tr>`).join('');
}

function deleteGuest(id) {
    if(confirm('Delete this guest?')) {
        guests = guests.filter(g => g.id !== id);
        saveData(); renderGuests();
    }
}

// ========== ROOM MANAGEMENT ==========
document.getElementById('roomForm').addEventListener('submit', e => {
    e.preventDefault();
    const roomNo = document.getElementById('roomNo').value;
    if (rooms.some(r => r.number === roomNo)) {
        alert('❌ Room number already exists!');
        return;
    }
    const selectedType = document.getElementById('roomType').value;
    const defaultPrice = roomTypeConfig[selectedType]?.price || 0;
    const room = {
        id: Date.now(),
        number: roomNo,
        type: selectedType,
        price: parseFloat(document.getElementById('roomPrice').value) || defaultPrice,
        status: document.getElementById('roomStatus').value,
        facilities: document.getElementById('roomFacilities').value
    };
    rooms.push(room);
    saveData(); renderRooms(); e.target.reset();
});

function renderRooms() {
    const list = document.getElementById('roomList');
    list.innerHTML = rooms.map(r => `
        <tr>
            <td>${r.number}</td>
            <td>${r.type}</td>
            <td>₱${r.price.toFixed(2)}</td>
            <td><span class="badge ${r.status.toLowerCase()}">${r.status}</span></td>
            <td>${r.facilities || '-'}</td>
            <td><button class="btn danger" onclick="deleteRoom(${r.id})">Delete</button></td>
        </tr>`).join('');
}

function deleteRoom(id) {
    if(confirm('Delete this room?')) {
        rooms = rooms.filter(r => r.id !== id);
        saveData(); renderRooms();
    }
}

// ========== ⚙️ SETTINGS PANEL — EDIT ROOM COUNTS ==========
function renderSettingsInputs() {
    const container = document.getElementById('settingsInputs');
    container.innerHTML = '';
    
    for (const [type, config] of Object.entries(roomTypeConfig)) {
        container.innerHTML += `
        <div class="form-card" style="margin:0;">
            <h4 style="color:var(--primary); margin-bottom:10px;">${type}</h4>
            <div class="form-group" style="margin-bottom:8px;">
                <label>Total Rooms</label>
                <input type="number" class="setting-total" data-type="${type}" 
                       value="${config.totalRooms}" min="1" required>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Price per Night (₱)</label>
                <input type="number" class="setting-price" data-type="${type}" 
                       value="${config.price}" min="0" step="50" required>
            </div>
        </div>`;
    }
    
    updateSettingsAvailability();
}

document.getElementById('settingsForm').addEventListener('submit', e => {
    e.preventDefault();
    
    document.querySelectorAll('.setting-total').forEach(input => {
        const type = input.dataset.type;
        const total = parseInt(input.value);
        const priceInput = document.querySelector(`.setting-price[data-type="${type}"]`);
        const price = parseFloat(priceInput.value);
        
        if (total > 0 && price >= 0 && roomTypeConfig[type]) {
            roomTypeConfig[type].totalRooms = total;
            roomTypeConfig[type].price = price;
        }
    });
    
    saveConfig();
    updateAvailabilityDisplay();
    updateSettingsAvailability();
    updateRoomTypeDropdown();
    alert('✅ Settings saved successfully!');
});

function updateSettingsAvailability() {
    const container = document.getElementById('settingsAvailability');
    let html = '<div class="availability-grid">';
    
    for (const [type, config] of Object.entries(roomTypeConfig)) {
        const occupied = getCurrentOccupied(type);
        const available = config.totalRooms - occupied;
        const statusClass = available > 0 ? 'available' : 'full';
        
        html += `
        <div class="availability-card ${statusClass}">
            <h4>${type}</h4>
            <p class="price">₱${config.price.toLocaleString()}/night</p>
            <p class="count">${available} / ${config.totalRooms} Available</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(occupied/config.totalRooms)*100}%"></div>
            </div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ========== AVAILABILITY CHECK LOGIC ==========
function getOccupiedCount(type, checkInDate, checkOutDate) {
    return reservations.filter(r => {
        if (r.roomType !== type) return false;
        const rIn = new Date(r.checkIn);
        const rOut = new Date(r.checkOut);
        const cIn = new Date(checkInDate);
        const cOut = new Date(checkOutDate);
        return !(cOut <= rIn || cIn >= rOut);
    }).length;
}

function getCurrentOccupied(type) {
    const today = new Date().toISOString().split('T')[0];
    return reservations.filter(r => {
        if (r.roomType !== type) return false;
        return r.checkIn <= today && r.checkOut > today;
    }).length;
}

function isRoomTypeAvailable(type, checkIn, checkOut) {
    const config = roomTypeConfig[type];
    if (!config) return false;
    const occupied = getOccupiedCount(type, checkIn, checkOut);
    return occupied < config.totalRooms;
}

function updateAvailabilityDisplay() {
    const container = document.getElementById('availabilityStatus');
    if (!container) return;
    
    const checkInVal = document.getElementById('checkIn').value;
    const checkOutVal = document.getElementById('checkOut').value;
    
    let html = '<h3>📋 Room Availability Status</h3><div class="availability-grid">';
    
    for (const [type, config] of Object.entries(roomTypeConfig)) {
        let occupied = 0;
        if (checkInVal && checkOutVal) {
            occupied = getOccupiedCount(type, checkInVal, checkOutVal);
        } else {
            occupied = getCurrentOccupied(type);
        }
        const available = config.totalRooms - occupied;
        const statusClass = available > 0 ? 'available' : 'full';
        
        html += `
        <div class="availability-card ${statusClass}">
            <h4>${type}</h4>
            <p class="price">₱${config.price.toLocaleString()}/night</p>
            <p class="count">${available} / ${config.totalRooms} Available</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(occupied/config.totalRooms)*100}%"></div>
            </div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

document.getElementById('checkIn')?.addEventListener('change', updateAvailabilityDisplay);
document.getElementById('checkOut')?.addEventListener('change', updateAvailabilityDisplay);

// ========== RESERVATION MODULE ==========
document.getElementById('reserveForm').addEventListener('submit', e => {
    e.preventDefault();
    
    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    const checkInVal = document.getElementById('checkIn').value;
    const checkOutVal = document.getElementById('checkOut').value;
    const roomType = document.getElementById('resRoomType').value;
    
    if (checkOut <= checkIn) {
        alert('❌ Check-out date must be after check-in date!');
        return;
    }
    
    if (!isRoomTypeAvailable(roomType, checkInVal, checkOutVal)) {
        const occupied = getOccupiedCount(roomType, checkInVal, checkOutVal);
        alert(`❌ Sorry! All ${roomType} rooms are fully booked for these dates.\n\nTotal: ${roomTypeConfig[roomType].totalRooms}\nBooked: ${occupied}\nAvailable: 0\n\nPlease choose another room type or adjust your dates.`);
        return;
    }
    
    const nights = Math.ceil((checkOut - checkIn) / (1000*60*60*24));
    const totalAmount = nights * roomTypeConfig[roomType].price;

    const res = {
        id: Date.now(),
        guestId: parseInt(document.getElementById('resGuest').value),
        roomType,
        checkIn: checkInVal,
        checkOut: checkOutVal,
        nights,
        totalAmount,
        numGuests: document.getElementById('numGuests').value,
        requests: document.getElementById('requests').value,
        status: 'Confirmed',
        createdAt: new Date().toLocaleString()
    };
    reservations.push(res);
    saveData(); renderReservations(); updateAvailabilityDisplay(); e.target.reset();
    alert(`✅ Reservation Successful!\n\nRoom Type: ${roomType}\nNights: ${nights}\nTotal Amount: ₱${totalAmount.toLocaleString()}`);
});

function renderReservations() {
    const list = document.getElementById('reserveList');
    list.innerHTML = reservations.map(r => {
        const guest = guests.find(g => g.id === r.guestId);
        return `
        <tr>
            <td>#${r.id.toString().slice(-6)}</td>
            <td>${guest ? guest.name : 'Unknown'}</td>
            <td>${r.roomType}</td>
            <td>${r.checkIn}</td>
            <td>${r.checkOut}</td>
            <td>₱${r.totalAmount.toLocaleString()}</td>
            <td><span class="badge paid">${r.status}</span></td>
            <td>
                <button class="btn danger" onclick="cancelRes(${r.id})">Cancel</button>
            </td>
        </tr>`;
    }).join('');
}

function cancelRes(id) {
    if(confirm('Cancel this reservation? The room slot will be returned to available count.')) {
        reservations = reservations.filter(r => r.id !== id);
        saveData(); renderReservations(); updateAvailabilityDisplay();
        alert('✅ Reservation cancelled. Slot is now available again.');
    }
}

// ========== PAYMENT MODULE ==========
document.getElementById('paymentForm').addEventListener('submit', e => {
    e.preventDefault();
    const resId = parseInt(document.getElementById('payRes').value);
    const payment = {
        id: Date.now(),
        resId,
        amount: parseFloat(document.getElementById('payAmount').value),
        method: document.getElementById('payMethod').value,
        status: document.getElementById('payStatus').value,
        remarks: document.getElementById('payRemarks').value,
        date: new Date().toLocaleString()
    };
    payments.push(payment);
    saveData(); renderPayments(); e.target.reset();
});

function renderPayments() {
    const list = document.getElementById('paymentList');
    list.innerHTML = payments.map(p => {
        const res = reservations.find(r => r.id === p.resId);
        const guest = res ? guests.find(g => g.id === res.guestId) : null;
        return `
        <tr>
            <td>${p.date}</td>
            <td>${guest ? guest.name : 'Res #' + (p.resId+'').slice(-6)}</td>
            <td>₱${p.amount.toFixed(2)}</td>
            <td>${p.method}</td>
            <td><span class="badge ${p.status.toLowerCase()}">${p.status}</span></td>
            <td><button class="btn danger" onclick="deletePayment(${p.id})">Delete</button></td>
        </tr>`;
    }).join('');
}

function deletePayment(id) {
    if(confirm('Delete this payment record?')) {
        payments = payments.filter(p => p.id !== id);
        saveData(); renderPayments();
    }
}

// ========== DROPDOWNS & STATS ==========
function updateRoomTypeDropdown() {
    const select = document.getElementById('resRoomType');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Type --</option>';
    for (const [type, config] of Object.entries(roomTypeConfig)) {
        select.innerHTML += `<option value="${type}">${type} - ₱${config.price.toLocaleString()}/night</option>`;
    }
}

function updateDropdowns() {
    let html = '<option value="">-- Choose Guest --</option>';
    guests.forEach(g => html += `<option value="${g.id}">${g.name} — ${g.contact}</option>`);
    document.getElementById('resGuest').innerHTML = html;

    html = '<option value="">-- Select Reservation --</option>';
    reservations.forEach(r => {
        const g = guests.find(x => x.id === r.guestId);
        html += `<option value="${r.id}">Res #${(r.id+'').slice(-6)} — ${g?.name || 'Unknown'} — ₱${r.totalAmount.toLocaleString()}</option>`;
    });
    document.getElementById('payRes').innerHTML = html;
    
    updateRoomTypeDropdown();
}

function updateStats() {
    document.getElementById('totalGuests').textContent = guests.length;
    document.getElementById('totalReservations').textContent = reservations.length;
    
    let totalAvailable = 0;
    for (const [type, config] of Object.entries(roomTypeConfig)) {
        totalAvailable += (config.totalRooms - getCurrentOccupied(type));
    }
    document.getElementById('availableRooms').textContent = totalAvailable;
    
    const totalRev = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('totalRevenue').textContent = '₱' + totalRev.toLocaleString('en-PH', {minimumFractionDigits:2});
}

// ========== EXPORT & CLEAR ==========
function exportData() {
    try {
        const data = {
            exportedAt: new Date().toLocaleString(),
            roomTypeConfig,
            guests,
            reservations,
            rooms,
            payments
        };
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hotel-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        alert('✅ Export successful!');
    } catch (error) {
        alert('❌ Export failed: ' + error.message);
    }
}

function clearAllData() {
    if(confirm('⚠️ This will DELETE ALL records AND reset settings to default! Are you sure?')) {
        localStorage.clear();
        roomTypeConfig = {
            Standard: { price: 1800, totalRooms: 5 },
            Deluxe: { price: 3200, totalRooms: 4 },
            Suite: { price: 5500, totalRooms: 2 },
            Family: { price: 4000, totalRooms: 3 }
        };
        saveConfig();
        guests = []; reservations = []; rooms = []; payments = [];
        renderAll();
        alert('✅ All data cleared and settings reset.');
    }
}

function renderAll() {
    renderGuests(); renderRooms(); renderReservations(); renderPayments();
    updateDropdowns(); updateStats(); updateAvailabilityDisplay();
    renderSettingsInputs();
}

const today = new Date().toISOString().split('T')[0];
document.getElementById('checkIn').min = today;
document.getElementById('checkOut').min = today;

renderAll();