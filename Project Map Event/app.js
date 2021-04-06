'use strict';

class Activity {
    id = (Date.now() + '').slice(-10).toString(16);
    constructor(coords, guest, time, duration) {
        this.coords = coords;
        this.guest = guest;
        this.time = time;
        this.duration = duration;
    }
}

class Working extends Activity {
    type = 'working';
    constructor(coords, guest, time, duration) {
        super(coords, guest, time, duration);
    }
}

class Entertaining extends Activity {
    type = 'entertaining';
    constructor(coords, guest, time, duration) {
        super(coords, guest, time, duration);
    }
}

// const activity = new Working(10, '25/03', 6);
// console.log(activity);


// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerActivities = document.querySelector('.activities');
const inputType = document.querySelector('.form__input--type');
const inputGuest = document.querySelector('.form__input--guest');
const inputTime = document.querySelector('.form__input--time');
const inputDuration = document.querySelector('.form__input--duration');
const logo = document.querySelector('.logo');
const boundBtn = document.querySelector('.boundBtn');
const gps = document.querySelector('.activity__icon-gps');
const instruction = document.querySelector('.instruction');


class App {
    constructor() {
        this._activities = [];
        this.map;
        this.mapZoomLevel = 13;
        this.activityToEdit;
        this.mapEvent;
        this.markers = [];
        this.FormEditMode = false;
        this.activityToEdit;
        this.activitiesCount;

        this._creatClock();

        // add HTML to give instruction
        this._displayInstruction();

        // Get user position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // see all marker (bound)
        boundBtn.addEventListener('click', this._boundMap.bind(this));

        // Attach Event Handler
        form.addEventListener('submit', this._formSubmitHandler.bind(this));

        // add Event Delegation Listener to control icon 
        containerActivities.addEventListener('click', this._activityControl.bind(this));
    }
    _displayInstruction() {
        this.activitiesCount = document.querySelectorAll('.activity').length + 1;
        if (this.activitiesCount === 1) {
            instruction.classList.remove('hidden');
        } else if (this.activitiesCount !== 1) {
            instruction.classList.add('hidden');
        }
    }

    _boundMap() {
        if (!this.markers[0]) return;
        var group = L.featureGroup(this.markers).addTo(this.map);
        this.map.fitBounds(group.getBounds(), { padding: [100, 100] });
    }

    _creatClock() {
        flatpickr(".form__input--time", { dateFormat: 'd-m-Y' });
    }

    _setLocalStorage() {
        localStorage.setItem('activities', JSON.stringify(this._activities));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('activities'));
        if (!data) return;

        data.forEach(activity => {
            activity.time = (new Date(activity.time));
            activity.__proto__ = activity.type === 'working' ? Working.prototype : Entertaining.prototype;
            this._renderActivity(activity);
        })

        this._activities = data;
    }
    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
                function () {
                    alert('Could not get your position!')
                });
    }
    _loadMap(position) {

        const { latitude } = position.coords;
        const { longitude } = position.coords;

        const coords = [latitude, longitude];

        // Display Leaflet map
        this.map = L.map('map').setView(coords, this.mapZoomLevel);

        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        }).addTo(this.map);

        // Handling click on map
        this.map.on('click', this._showForm.bind(this));     // Click vào 1 điểm sẽ trả về 1 Event

        // call back Async display marker from localStorage
        this._activities.forEach(activity => {
            this._renderActivityMarker(activity);
        })
    }

    _showForm(mapE) {
        this.mapEvent = mapE;
        instruction.classList.add('hidden');
        form.classList.remove('hidden');
        inputGuest.focus();                 // Đặt con trỏ vào form input này 
    }

    _formSubmitHandler(e) {
        e.preventDefault();

        const validNumber = (...inputs) => inputs.every(input => Number.isFinite(input));
        const validPositive = (...inputs) => inputs.every(input => input > 0);

        // insert all input from form to an Object
        const getInputValue = {
            type: inputType.value,
            guest: +inputGuest.value,
            time: this._getDateFormatted(inputTime.value),
            duration: +inputDuration.value
        }

        // check if data is valid
        if (!validNumber(getInputValue.guest, getInputValue.duration) ||
            !validPositive(getInputValue.guest, getInputValue.duration)) return alert('input has to be positive number');

        // If user has clicked on Map, and Edit mode is false => creat new Activity
        if (this.mapEvent && !this.FormEditMode) return this._newActivity(getInputValue);

        // If user want to edit an existing activities
        if (!this.mapEvent && this.FormEditMode) return this._editActivity(getInputValue);

        // else
        else (alert('does not regconize action!'));
    }

    _newActivity(getInputValue) {
        const { type, guest, time, duration } = getInputValue;

        let activity;

        const { lat, lng } = this.mapEvent.latlng;


        if (type === 'working') {
            activity = new Working([lat, lng], guest, time, duration);
        }
        if (type === 'entertaining') {
            activity = new Entertaining([lat, lng], guest, time, duration);
        }
        this._activities.push(activity);

        this._hideForm();

        this._renderActivityMarker(activity);

        this._renderActivity(activity);

        // set local storage to all workouts
        this._setLocalStorage();

        this._displayInstruction()
    }

    _getDateFormatted(dateInput) {
        const day = dateInput.slice(0, 2);
        const month = dateInput.slice(4, 5) - 1;
        const year = dateInput.slice(6);
        return new Date(year, month, day);
    }

    _hideForm() {
        // empty the input
        inputGuest.value = inputTime.value = inputDuration.value = '';

        // add Hidden class
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => (form.style.display = 'grid'), 200);
    }

    _renderActivityMarker(activity) {
        let myMarker = new L.marker(activity.coords);

        // save marker id to markers array
        myMarker._id = activity.id;
        this.markers.push(myMarker);

        myMarker.addTo(this.map).bindPopup(                        // tạo popup vào Marker này
            L.popup({                      // Phần popup option
                maxWidth: 250,             // các option này tìm trong docs của Leaflet
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${activity.type}-popup`,
            })
        )
            .setPopupContent(`${activity.type === 'working' ? '💼' : '⚽'} ${activity.type === 'working' ? 'Công việc' : 'Giải trí'} vào ngày ${activity.time.getDate()}/${activity.time.getMonth() + 1}`)                  // Thay đổi nội dung cho popup
            .openPopup();
    }

    _renderActivity(activity) {
        const dayRemain = Math.ceil((activity.time - new Date()) / (24 * 60 * 60 * 1000));
        const dayDiscription = function () {
            if (dayRemain === 1) return 'ngày mai';
            if (dayRemain === -1) return 'hôm qua';
            if (dayRemain < 0) return 'ngày trước';
            return 'ngày nữa';
        }
        this.activitiesCount = document.querySelectorAll('.activity').length + 1

        const html = `
        <li class="activity activity--${activity.type}" data-id="${activity.id}">
                <div class="activity__icon-container activity__icon-gps">
                    <svg class="activity__icon-control">
                        <use xlink:href="sprite.svg#icon-gps_fixed"></use>
                    </svg>
                </div>
                <div class="activity__icon-container activity__icon-delete">
                    <svg class="activity__icon-control">
                        <use xlink:href="sprite.svg#icon-remove_circle"></use>
                    </svg>
                </div>
                <div class="activity__icon-container activity__icon-edit">
                    <svg class="activity__icon-control">
                        <use xlink:href="sprite.svg#icon-create"></use>
                    </svg>
                </div>
                <h2 class="activity__title">${this.activitiesCount}. ${activity.type === 'working' ? 'Công việc' : 'Giải trí'} vào ngày ${activity.time.getDate()}/${activity.time.getMonth() + 1}</h2>
                <div class="activity__details">
                    <span class="activity__icon">👨</span>
                    <span class="activity__value activity__value-persons">${activity.guest}</span>
                    <span class="activity__unit">người</span>
                </div>
                <div class="activity__details">
                    <span class="activity__icon">📆</span>
                    <span class="activity__value activity__value-time">${activity.time.getDate()}/${activity.time.getMonth() + 1}</span>
                    <span class="activity__unit">ngày tháng</span>
                </div>
                <div class="activity__details">
                    <span class="activity__icon">⏱</span>
                    <span class="activity__value activity__value-duration">${activity.duration}</span>
                    <span class="activity__unit">tiếng</span>
                </div>
                <div class="activity__details">
                    <span class="activity__icon">⏳</span>
                    <span class="activity__value activity__value-day">${Math.abs(dayRemain) > 1 ? Math.abs(dayRemain) : ''}</span>
                    <span class="activity__unit">${dayDiscription()}</span>
                </div>
            </li>
        `;
        form.insertAdjacentHTML('afterend', html);
        this._displayInstruction();
    }

    _activityControl(e) {

        // Check if user click at icon control
        const controlTarget = e.target.closest('.activity__icon-container');
        if (!controlTarget) return;

        // Check which activity own that icon
        const activityEl = e.target.closest('.activity');
        const activity = this._activities.find(x => x.id === activityEl.dataset.id);

        // Check what type of icon then return the corresponding function
        if (controlTarget.classList.contains('activity__icon-gps')) return this._moveToPopUp(activity);
        if (controlTarget.classList.contains('activity__icon-edit')) {
            this._showForm();
            this.FormEditMode = true;
            this.activityToEdit = activity;
        }
        if (controlTarget.classList.contains('activity__icon-delete')) return this._deleteActivity(activity);
    }

    _moveToPopUp(activity) {
        this.map.setView(activity.coords, this.mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
    }

    _editActivity(getInputValue) {
        const { type, guest, time, duration } = getInputValue;

        this.activityToEdit.type = type;
        this.activityToEdit.guest = guest;
        this.activityToEdit.time = time;
        this.activityToEdit.duration = duration;

        this._setLocalStorage();

        this._deleteActivityUI();
        this._deleteMarker(this.activityToEdit);

        this._hideForm();

        this._activities.forEach(activity => {
            this._renderActivity(activity);
            this._renderActivityMarker(activity);
        })

        this.FormEditMode = false;
    }

    // delete activity in UI only
    _deleteActivityUI(activity) {
        const activityToDel = document.querySelectorAll('.activity');
        activityToDel.forEach(x => x.remove());

        // nếu ko còn activity nào thì hiện instruction
        this._displayInstruction()
    }

    _deleteMarker(activity) {
        let newMarker = [];
        this.markers.forEach(x => {
            if (x._id === activity.id) { this.map.removeLayer(x) }
            else { newMarker.push(x) }
        });
        this.markers = newMarker;
    }

    _deleteAllMarker() {
        this.markers.forEach(x => this.map.removeLayer(x));
    }

    // delete activity in storage and UI
    _deleteActivity(activity) {
        this._activities = this._activities.filter(x => x.id !== activity.id);
        this._deleteActivityUI();
        this._deleteMarker(activity);

        this._setLocalStorage();

        this._activities.forEach(activity => {
            this._renderActivity(activity);
        })
    }

    reset() {
        localStorage.removeItem('activities');
        location.reload();
    }
}


const app = new App();
// console.log(app);