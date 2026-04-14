/**
 * Major cities / towns per Indian state and UT.
 * Keys must match the state names used in Profile.jsx INDIAN_STATES list.
 */
const CITIES_BY_STATE = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati',
    'Rajahmundry', 'Kakinada', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole',
    'Vizianagaram', 'Chittoor', 'Srikakulam', 'Machilipatnam', 'Bhimavaram',
  ],
  'Arunachal Pradesh': [
    'Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila', 'Tezu',
  ],
  'Assam': [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia',
    'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu', 'Goalpara', 'Sivasagar',
  ],
  'Bihar': [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga',
    'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Munger', 'Chhapra',
    'Bettiah', 'Samastipur', 'Hajipur', 'Sasaram', 'Siwan',
  ],
  'Chhattisgarh': [
    'Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon',
    'Jagdalpur', 'Raigarh', 'Ambikapur', 'Dhamtari',
  ],
  'Goa': [
    'Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim',
    'Canacona', 'Calangute', 'Anjuna',
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar',
    'Junagadh', 'Gandhinagar', 'Anand', 'Nadiad', 'Morbi', 'Mehsana',
    'Bharuch', 'Vapi', 'Navsari', 'Surendranagar', 'Porbandar', 'Amreli',
    'Godhra', 'Palanpur',
  ],
  'Haryana': [
    'Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak',
    'Hisar', 'Karnal', 'Sonipat', 'Panchkula', 'Bhiwani', 'Sirsa',
    'Bahadurgarh', 'Jind', 'Thanesar', 'Kaithal', 'Rewari', 'Palwal',
  ],
  'Himachal Pradesh': [
    'Shimla', 'Solan', 'Dharamsala', 'Mandi', 'Palampur', 'Baddi',
    'Nahan', 'Kullu', 'Hamirpur', 'Una', 'Chamba', 'Bilaspur',
  ],
  'Jharkhand': [
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro',
    'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar', 'Chirkunda',
  ],
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Hubli', 'Dharwad', 'Mangaluru', 'Belagavi',
    'Davanagere', 'Ballari', 'Vijayapura', 'Shivamogga', 'Tumkur',
    'Raichur', 'Bidar', 'Hassan', 'Udupi', 'Hospet', 'Gadag',
    'Robertsonpet', 'Chitradurga', 'Kolar',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur',
    'Palakkad', 'Alappuzha', 'Kannur', 'Kottayam', 'Malappuram',
    'Thalassery', 'Punalur', 'Vatakara', 'Kayamkulam',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar',
    'Dewas', 'Satna', 'Ratlam', 'Rewa', 'Murwara', 'Singrauli',
    'Burhanpur', 'Khandwa', 'Bhind', 'Chhindwara', 'Shivpuri',
    'Vidisha', 'Chhatarpur', 'Damoh',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur',
    'Kolhapur', 'Thane', 'Amravati', 'Nanded', 'Jalgaon', 'Akola',
    'Latur', 'Dhule', 'Ahmednagar', 'Chandrapur', 'Parbhani',
    'Ichalkaranji', 'Jalna', 'Ambernath', 'Bhiwandi', 'Navi Mumbai',
    'Vasai-Virar', 'Malegaon', 'Satara', 'Ratnagiri',
  ],
  'Manipur': [
    'Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Senapati',
  ],
  'Meghalaya': [
    'Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Baghmara',
  ],
  'Mizoram': [
    'Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib',
  ],
  'Nagaland': [
    'Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto',
  ],
  'Odisha': [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur',
    'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda',
    'Jeypore', 'Bargarh', 'Paradip', 'Kendujhar',
  ],
  'Punjab': [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda',
    'Mohali', 'Hoshiarpur', 'Batala', 'Pathankot', 'Moga',
    'Firozpur', 'Barnala', 'Gurdaspur', 'Ropar', 'Kapurthala',
    'Faridkot', 'Sangrur', 'Fatehgarh Sahib',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur',
    'Bhilwara', 'Alwar', 'Bharatpur', 'Sikar', 'Sri Ganganagar',
    'Pali', 'Tonk', 'Barmer', 'Jhunjhunu', 'Chittorgarh',
    'Hanumangarh', 'Nagaur', 'Beawar', 'Sawai Madhopur',
  ],
  'Sikkim': [
    'Gangtok', 'Namchi', 'Mangan', 'Gyalshing',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
    'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi',
    'Dindigul', 'Thanjavur', 'Ranipet', 'Sivakasi', 'Karur',
    'Udhagamandalam', 'Hosur', 'Nagercoil', 'Kanchipuram', 'Kumarapalayam',
    'Karaikkudi', 'Pudukkottai', 'Kumbakonam', 'Avadi', 'Ambur',
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
    'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Suryapet',
    'Miryalaguda', 'Siddipet', 'Sangareddy', 'Mancherial',
  ],
  'Tripura': [
    'Agartala', 'Dharmanagar', 'Udaipur', 'Kailasahar', 'Belonia',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut',
    'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Saharanpur',
    'Gorakhpur', 'Noida', 'Firozabad', 'Jhansi', 'Muzaffarnagar',
    'Mathura', 'Rampur', 'Shahjahanpur', 'Farrukhabad', 'Mau',
    'Hapur', 'Etawah', 'Mirzapur', 'Bulandshahr', 'Sambhal',
    'Amroha', 'Hardoi', 'Fatehpur', 'Raebareli', 'Orai',
  ],
  'Uttarakhand': [
    'Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur',
    'Kashipur', 'Rishikesh', 'Pithoragarh', 'Ramnagar', 'Mussoorie',
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman',
    'Malda', 'Baharampur', 'Habra', 'Kharagpur', 'Shantipur', 'Dankuni',
    'Dhulian', 'Ranaghat', 'Haldia', 'Raiganj', 'Krishnanagar',
    'Nabadwip', 'Medinipur', 'Jalpaiguri',
  ],
  // Union Territories
  'Andaman and Nicobar Islands': [
    'Port Blair', 'Diglipur', 'Rangat', 'Mayabunder',
  ],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Diu', 'Silvassa'],
  'Delhi': [
    'New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Lajpat Nagar',
    'Saket', 'Vasant Kunj', 'Karol Bagh', 'Pitampura', 'Preet Vihar',
    'Mayur Vihar', 'Shahdara', 'Uttam Nagar', 'Narela',
  ],
  'Jammu and Kashmir': [
    'Srinagar', 'Jammu', 'Anantnag', 'Sopore', 'Baramulla', 'Kathua',
    'Udhampur', 'Punch', 'Rajouri',
  ],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
};

export default CITIES_BY_STATE;
