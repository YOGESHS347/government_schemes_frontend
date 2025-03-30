document.addEventListener('DOMContentLoaded', function() {
    // Form navigation
    const formSteps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    const form = document.getElementById('schemeForm');
    
    // Current step tracker
    let currentStep = 0;
    
    // Update form visibility based on step
    function updateFormSteps() {
        formSteps.forEach((step, index) => {
            step.classList.remove('active');
            progressSteps[index].classList.remove('active');
        });
        
        formSteps[currentStep].classList.add('active');
        progressSteps[currentStep].classList.add('active');
        
        // Hide previous button on first step
        if (currentStep === 0) {
            document.querySelector('.prev-btn').style.visibility = 'hidden';
        } else {
            document.querySelector('.prev-btn').style.visibility = 'visible';
        }
    }
    
    // Validate current step
    function validateStep(step) {
        let isValid = true;
        const inputs = formSteps[step].querySelectorAll('input[required], select[required]');
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.classList.add('error');
                
                // Add error message if not already present
                const errorElement = input.parentElement.querySelector('.error-text');
                if (!errorElement) {
                    const error = document.createElement('span');
                    error.className = 'error-text';
                    error.textContent = 'This field is required';
                    error.style.color = 'var(--secondary-color)';
                    error.style.fontSize = '14px';
                    error.style.marginTop = '5px';
                    error.style.display = 'block';
                    input.parentElement.appendChild(error);
                }
            } else {
                input.classList.remove('error');
                const errorElement = input.parentElement.querySelector('.error-text');
                if (errorElement) {
                    errorElement.remove();
                }
            }
        });
        
        return isValid;
    }
    
    // Handle next button clicks
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                updateFormSteps();
                window.scrollTo(0, document.querySelector('.user-form').offsetTop - 100);
            }
        });
    });
    
    // Handle previous button clicks
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentStep--;
            updateFormSteps();
            window.scrollTo(0, document.querySelector('.user-form').offsetTop - 100);
        });
    });
    function displayResults(data) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = ''; // Clear previous content
    
        if (Array.isArray(data.schemes)) {
            // If data.schemes is an array, display each scheme in structured HTML
            data.schemes.forEach(scheme => {
                const schemeDiv = document.createElement('div');
                schemeDiv.className = 'scheme';
                schemeDiv.innerHTML = `
                    <h2>${scheme.schemeName}</h2>
                    <p><strong>Description:</strong> ${scheme.description}</p>
                    <p><strong>Eligibility:</strong> ${scheme.eligibility}</p>
                    <p><strong>Benefits:</strong> ${scheme.benefits}</p>
                    <p><strong>Apply Here:</strong> <a href="${scheme.applyLink}" target="_blank">${scheme.applyLink}</a></p>
                `;
                resultsContainer.appendChild(schemeDiv);
            });
        } else if (typeof data.schemes === "string") {
            // If data.schemes is a string, assume it's Markdown and convert to HTML using marked.js
            const htmlContent = marked.parse(data.schemes);
            resultsContainer.innerHTML = htmlContent;
        } else {
            // Fallback: display raw JSON
            resultsContainer.textContent = JSON.stringify(data.schemes, null, 2);
        }
    }
    
    
    


// Handle form submission
form.addEventListener('submit', function(event) {
    event.preventDefault();
    
    // Only proceed if the current step's required fields are valid
    if (validateStep(currentStep)) {
        // Create and show a loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Matching schemes for you...</div>
        `;
        document.body.appendChild(loadingOverlay);
        loadingOverlay.style.display = 'flex';
        
        // Collect form data
        const formData = new FormData(form);
        const userData = {};
        
        // Convert formData into a JSON object
        formData.forEach((value, key) => {
            // For checkboxes, accumulate values into an array
            if (key === 'interests' || key === 'notifications' || key === 'specialCategories') {
                if (!userData[key]) {
                    userData[key] = [];
                }
                userData[key].push(value);
            } else {
                userData[key] = value;
            }
        });
        
        // Calculate age from Date of Birth if provided
        if (userData.dob) {
            const birthDate = new Date(userData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            userData.age = age;
        }
        
        console.log('Sending user data to backend:', userData);
        
        // Send the JSON data to your backend endpoint
        fetch('https://government-schemes-backend.onrender.com/get-schemes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        })
        .then(response => {
            // Remove loading overlay
            loadingOverlay.style.display = 'none';
            document.body.removeChild(loadingOverlay);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Log the received schemes for debugging
            console.log('Schemes received:', data);
            
            // Redirect or process the response as needed.
            // For example, if your backend returns a sessionId:
            if(data.sessionId){
                window.location.href = 'results.html?id=' + data.sessionId;
            } else {
                // Alternatively, display the results directly
                displayResults(data);
            }
        })
        .catch(error => {
            // Ensure the loading overlay is removed if an error occurs
            if (document.body.contains(loadingOverlay)) {
                loadingOverlay.style.display = 'none';
                document.body.removeChild(loadingOverlay);
            }
            
            // Display an error message below the form
            console.error('Error:', error);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `
                <p><strong>Error:</strong> There was a problem connecting to the server. Please try again later.</p>
            `;
            form.appendChild(errorMessage);
            errorMessage.style.display = 'block';
            
            // Smooth scroll to the error message
            errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove error message after 5 seconds
            setTimeout(() => {
                if (document.body.contains(errorMessage)) {
                    errorMessage.style.display = 'none';
                    form.removeChild(errorMessage);
                }
            }, 5000);
        });
    }
});

    // State-District dynamic dropdowns
    const stateSelect = document.getElementById('state');
    const districtSelect = document.getElementById('district');
    
    // Sample state-district data (replace with complete data in production)
    const stateDistricts = {
        "andhra_pradesh": ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],

"arunachal_pradesh": ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke-Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],

"assam": ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],

"bihar": ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],

"chhattisgarh": ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja'],

"goa": ['North Goa', 'South Goa'],

"gujarat": ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],

"haryana": ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],

"himachal_pradesh": ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],

"jharkhand": ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],

"karnataka": ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'],

"kerala": ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],

"madhya_pradesh": ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],

"maharashtra": ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Nagpur', 'Nashik', 'Nanded', 'Nandurbar', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],

"manipur": ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul', 'Kamjong', 'Kangpokpi', 'Noney', 'Tengnoupal', 'Pherzawl'],

"meghalaya": ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],

"mizoram": ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],

"nagaland": ['Dimapur', 'Kohima', 'Mokokchung', 'Mon', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],

"odisha": ['Angul', 'Balangir', 'Baleshwar', 'Bhadrak', 'Bargarh', 'Baudh', 'Cuttack', 'Debagarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],

"punjab": ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Firozpur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Tarn Taran'],

"rajasthan": ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],

"sikkim": ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],

"tamil_nadu": ['Ariyalur', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],

"telangana": ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal (Rural)', 'Warangal (Urban)', 'Yadadri Bhuvanagiri'],

"tripura": ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],

"uttar_pradesh": ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],

"uttarakhand": ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],

"west_bengal": ['Alipurduar', 'Bankura', 'Birbhum', 'Bardhaman', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Medinipur', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],

"andaman_nicobar": ['Nicobar', 'North and Middle Andaman', 'South Andaman'],

"chandigarh": ['Chandigarh'],

"dadra_nagar_haveli_daman_diu": ['Dadra and Nagar Haveli', 'Daman', 'Diu'],

"delhi": ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],

"jammu_kashmir": ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],

"ladakh": ['Kargil', 'Leh'],

"lakshadweep": ['Agatti', 'Amini', 'Androth', 'Bithra', 'Chethlath', 'Kavaratti', 'Kadmat', 'Kalpeni', 'Minicoy'],

"puducherry": ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']

    };
    
    // Update districts based on selected state
    if (stateSelect && districtSelect) {
        stateSelect.addEventListener('change', function() {
            const selectedState = this.value;
            
            // Clear district dropdown
            districtSelect.innerHTML = '<option value="">Select District</option>';
            
            // Populate districts if state is selected
            if (selectedState && stateDistricts[selectedState]) {
                stateDistricts[selectedState].forEach(district => {
                    const option = document.createElement('option');
                    option.value = district.toLowerCase().replace(/ /g, '_');
                    option.textContent = district;
                    districtSelect.appendChild(option);
                });
            }
        });
    }
    
    // Show/hide additional fields based on selection
    const studyingRadios = document.querySelectorAll('input[name="currentlyStudying"]');
    const currentEducationField = document.getElementById('current-education-level');
    
    studyingRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes' && this.checked) {
                currentEducationField.style.display = 'block';
            } else {
                currentEducationField.style.display = 'none';
            }
        });
    });
    
    // Show/hide contact fields based on notification preferences
    const notificationCheckboxes = document.querySelectorAll('input[name="notifications"]');
    const emailField = document.getElementById('email-field');
    const phoneField = document.getElementById('phone-field');
    
    notificationCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.value === 'email') {
                emailField.style.display = this.checked ? 'block' : 'none';
            } else if (this.value === 'sms') {
                phoneField.style.display = this.checked ? 'block' : 'none';
            }
        });
    });
    
    // Reset form on initial load
    updateFormSteps();
    
    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Remove field validation styling on input
    const formInputs = document.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('error');
            const errorElement = this.parentElement.querySelector('.error-text');
            if (errorElement) {
                errorElement.remove();
            }
        });
    });
    
    // Helper function to calculate age from date of birth
    function calculateAge(dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();
        
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Auto-check "Senior Citizen" based on age
    const dobInput = document.getElementById('dob');
    const seniorCitizenCheckbox = document.querySelector('input[name="specialCategories"][value="senior_citizen"]');
    
    if (dobInput && seniorCitizenCheckbox) {
        dobInput.addEventListener('change', function() {
            const age = calculateAge(this.value);
            if (age >= 60) {
                seniorCitizenCheckbox.checked = true;
            }
        });
    }
});
