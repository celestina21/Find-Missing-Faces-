// Check if access token is expired 
function tokenExpired(token) {
    try {
        // Decode the access token
        var decodedAccessToken = jwt_decode(token);
        // Check if the expiration time of the access token is less than the current time 
        return decodedAccessToken.exp * 1000 < Date.now();
    } catch (error) {
        // If there is an error, return true to force the user to sign in again regardless 
        return true;
    }
}


// Get the tokens and username from the local storage to check if the user is signed in
function checkAuthState() {
    // Get the access token from the local storage
    var accessToken = localStorage.getItem("accessToken");
    // Check if the access token is expired
    var accessTokenExpired = tokenExpired(accessToken);

    if (accessToken && !accessTokenExpired) {
        // If all tokens and the username are present, the user is signed in
        return;
    } else {
        // If any of the tokens or the username is missing, redirect to the authentication page
        location.href = "authenticationPage.html";
    }
}


// Log out the user from the website
function logOut() {
    var accessToken = localStorage.getItem("accessToken");

    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/authentication", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // Send the action to be done and the access token to the API
        body: JSON.stringify({
            action: "logOut",
            accessToken: accessToken
        })
    })
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message and do not proceed
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error)}`);
                    return null;
                });
            } else {
                // Parse the JSON from the response
                return response.json();
            }
        })
        .then(data => {
            // After successful log out, clear the local storage to get rid of precious tokens and display a message
            localStorage.clear();
            alert("Logged out successfully!");
            // Redirect to the authentication page
            location.href = "authenticationPage.html"
        })
        .catch(error => {
            alert("Log out failed.");
            alert("Error\n", error);
        });
}


// Function to create a preview of a profile with the person's portrait, name, last seen location and date, and contact number.
function previewProfile(id, portraitSrc, name, last_location, last_seen_date, contact) {
    var profile = document.createElement("a");
    profile.className = "profile";
    profile.href = `./viewProfile.html?id=${id}`;

    var profileSpace = document.createElement("div");
    profileSpace.className = "profileSpace";

    var portrait = document.createElement("img");
    portrait.className = "portrait";
    portrait.src = portraitSrc;

    var details = document.createElement("div");
    details.className = "details";

    var nameHeading = document.createElement("h2");
    nameHeading.className = "name";
    nameHeading.textContent = name;

    var lastSeenDate = new Date(last_seen_date);
    var year = lastSeenDate.getFullYear();
    var month = lastSeenDate.getMonth() + 1;
    var day = lastSeenDate.getDate();
    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }

    var lastSeen = document.createElement("p");
    lastSeen.className = "lastSeen";

    if (last_location !== null) {
        lastSeen.innerHTML = `<i>Last seen at: <b>${last_location}</b> on <b>${day}/${month}/${year}</b></i>`;
    } else {
        lastSeen.innerHTML = `<i>Last seen on <b>${day}/${month}/${year}</b></i>`;
    }

    var contactNumber = document.createElement("p");
    contactNumber.className = "contact";
    contactNumber.textContent = `Close contact: ${contact}`;

    details.appendChild(nameHeading);
    details.appendChild(lastSeen);
    details.appendChild(contactNumber);

    profileSpace.appendChild(portrait);
    profileSpace.appendChild(details);
    profile.appendChild(profileSpace);

    return profile;
}

// Function to display previews of all profiles in the database, or the profiles in the search output depending on what is passed in.
function displayResults(profiles) {
    var displaySpace = document.getElementById("results");
    var displayedProfiles = document.createElement("div");
    displayedProfiles.id = "displayedProfiles";

    for (var profile of profiles) {
        // Append a cache-busting query parameter to the URL
        var timestamp = new Date().getTime();
        var portraitSrc = profile.portrait += `?t=${timestamp}`;
        var profilePreview = previewProfile(profile.person_id, portraitSrc, profile.name, profile.last_location, profile.last_seen_date, profile.contact);
        displayedProfiles.appendChild(profilePreview);
    }
    // Replace the previously displayed profiles with the ones created.
    displaySpace.replaceChild(displayedProfiles, displaySpace.firstChild);
}

// Function to display all the profiles if no search entry is entered.
// Queries the database for all profiles.
function displayAllProfiles() {
    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/all")
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message and do not proceed
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error.error)}`);
                    return null
                });
            }
            // Parse the JSON from the response
            return response.json();
        })
        .then(data => {
            // Call the function to display the results
            displayResults(data);
        })
        .catch(error => {
            // Handle any errors that occurred during the fetch operation
            alert("Error trying to retrieve missing people's profiles\n", error);
        });
}

// Function to filter data based on search input. If the input is empty, it will display all profiles.
function filterData() {
    var searchInput = document.getElementById("searchInput");
    var searchTerm = searchInput.value.trim().toLowerCase();
    // If the search term is not empty, use it to filter the data
    if (searchTerm.length > 0) {
        fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/all")
            .then(response => {
                if (!response.ok) {
                    // If response status is not status 200, display the error message and do not proceed
                    return response.json().then(error => {
                        alert(`Error: ${JSON.stringify(error.error)}`);
                        return null
                    });
                }
                // Parse the JSON from the response
                return response.json();
            })
            .then(data => {
                // Filter the data based on the search term
                var filteredData = data.filter((item) => item.name.toLowerCase().includes(searchTerm));
                displayResults(filteredData);
            })
            .catch(error => {
                // Handle any errors that occurred during the fetch operation
                alert("Error trying to retrieve profiles\n", error);
            });
    } else {
        // If the search term is empty, display all profiles
        displayAllProfiles();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Check if the user is signed in once the page is loaded
    checkAuthState();

    // Display all profiles when the page is loaded
    displayAllProfiles();

    // When something is typed into the search bar, filter the data based on the input.
    document.getElementById("searchInput").addEventListener("input", function () {
        filterData();
    });
});
