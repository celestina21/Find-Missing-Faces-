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
    // Get the access token from the local storage
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
            location.href = "authenticationPage.html";
        })
        .catch(error => {
            alert("Log out failed.");
            alert("Error\n", error);
        });
}


// Function to fetch and return a profile based on person_id from query parameter.
async function fetchProfile() {
    // Get the profile ID from the query parameter in the URL 
    var urlParams = new URLSearchParams(window.location.search);
    var profileId = urlParams.get("id");

    // Fetch the profile details from the API
    return fetch(`https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/${profileId}`)
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message and do not proceed
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error.error)}`);
                    return null;
                });
            } else {
                // Parse the JSON from the response
                return response.json();
            }
        })
        .then(profile => {
            // Return the profile details
            return profile;
        })
        .catch(error => {
            // Handle any errors that occurred during the fetch operation
            alert("Error fetching the profile\n", error);
            return null;
        });
}

// Function to display profile details based on profile passed in
function displayProfile(profile) {
    if (profile) {
        document.getElementById("portrait").src = profile.portrait;
        document.getElementById("name").value = profile.name;
        document.getElementById("last_location").value = profile.last_location || "";
        var lastSeenDate = new Date(profile.last_seen_date);
        var year = lastSeenDate.getFullYear();
        var month = lastSeenDate.getMonth() + 1;
        var day = lastSeenDate.getDate();
        if (month < 10) {
            month = "0" + month;
        }
        if (day < 10) {
            day = "0" + day;
        }
        lastSeenDate = `${year}-${month}-${day}`;
        document.getElementById("last_seen_date").value = lastSeenDate;
        document.getElementById("description").value = profile.description || "";
        document.getElementById("contact").value = profile.contact;
    } else {
        // If the profile is not found, direct user to 404 Error page.
        location.href = "404Error.html";
    }
}

// Function to display the image of the profile or the image uploaded by the user
// If file type is invalid, it returns null.
function displayImage(input) {
    var validFormats = ["image/jpeg", "image/png"];
    var existingImage = document.getElementById("portrait");
    var file = input.files[0];

    if (file) {
        // If the file selected is of an invalid file type for Amazon Rekognition, reject it and alert the user.
        if (!validFormats.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG).");
            return null;
        }
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            existingImage.src = reader.result;
        };
    }
}

// Function to check if the character is an alphabet and returnw a boolean. 
function checkForAlphabet(character) {
    return /[a-zA-Z]/.test(character);
}

// Function to validate inputs then update the profile with the inputs. 
function updateProfile(profile) {
    var feedback = "";
    var image = null;
    var dataURL = document.getElementById("portrait").src;
    if (dataURL.startsWith("data:image/")) {
        // Extract the base64 part by removing the prefix
        image = dataURL.split(",")[1];
    } else {
        // If no image was uploaded, use the existing s3 URL.
        image = profile.portrait;
    }
    var name = document.getElementById("name").value.trim();
    var last_location = document.getElementById("last_location").value.trim();
    var last_seen_date = document.getElementById("last_seen_date").value.trim();
    var description = document.getElementById("description").value.trim();
    var contact = document.getElementById("contact").value.trim();

    if (name === "") {
        feedback += "Please enter their full name.\n";
    }
    if (last_location === "") {
        last_location = null;
    }
    if (last_seen_date === "") {
        feedback += "Please enter the date they were last seen.\n";
    }
    if (description === "") {
        description = null;
    }
    if (contact === "") {
        feedback += "Please enter a contact number.\n";
    }

    // Use regex to check if the name entered consists only of alphabets.
    var nameValid = /^[a-zA-Z\s]+$/.test(name);
    if (!nameValid) {
        feedback += "There should only be alphabets in a name.\n";
    }
    if (name.length < 5) {
        feedback += "Name should be at least 5 characters long.\n";
    }

    if (last_location !== null) {
        if (last_location.length < 10) {
            feedback += "Last seen location should be at least 10 characters long.\n";
        }
        var locationAlphabetCounter = 0;
        for (var character of last_location) {
            if (checkForAlphabet(character)) {
                locationAlphabetCounter += 1;
            } else if (locationAlphabetCounter === 5) {
                break;
            } else {
                continue;
            }
        }
        if (locationAlphabetCounter < 5) {
            feedback += "There should be at least 5 letters in the location details.\n"
        }
    }

    if (description !== null) {
        if (description.length < 20) {
            feedback += "Description should be at least 20 characters long.\n";
        }
        var descriptionAlphabetCounter = 0;
        for (var character of description) {
            if (checkForAlphabet(character)) {
                descriptionAlphabetCounter += 1;
            } else if (descriptionAlphabetCounter === 10) {
                break;
            } else {
                continue;
            }
        }
        if (descriptionAlphabetCounter < 10) {
            feedback += "Your description should contain at least 10 letters.\n"
        }
    }

    // Use regex to check if the mobile number entered is in the E.164 format required for Amazon SNS.
    var contactValid = /^\+\d+$/.test(contact);
    if (!contactValid) {
        feedback += "Please enter a valid contact number.\n";
    }
    if (contact.length < 6) {
        feedback += "Contact number should be at least 6 characters long. Please follow the format specified.\n";
    }
    if (contact.length > 15) {
        feedback += "Contact number should be at most 15 characters long.\n";
    }

    if (feedback) {
        alert(feedback);
        return;
    }

    var confirmUpdate = confirm("Are you sure you want to update the profile? Once you do so, the changes cannot be undone.")
    if (!confirmUpdate) {
        alert("Profile update cancelled.");
        location.reload();
        return;
    }

    // Create a new profile object with the updated details.
    var newProfile = {
        person_id: profile.person_id,
        key: profile.key,
        image: image,
        name: name,
        last_location: last_location,
        last_seen_date: last_seen_date,
        description: description,
        contact: contact,
    };

    // Send a PUT request to the API to update the profile.
    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/update", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        // Send the new profile details to the API
        body: JSON.stringify(newProfile)
    })
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message and do not proceed
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error.error)}`);
                    location.reload();
                    return null;
                });
            } else {
                // Parse the JSON from the response
                return response.json();
            }
        })
        .then(data => {
            // If the response contains a message of an issue, display the message
            if (data.message === "No faces detected in the image") {
                alert("No faces detected in the image. Please submit a clear portrait.");
                location.reload();
                return;
            } else if (data.message === "This face is already in our database!") {
                alert("This face is already in our database! Please submit a different portrait.\nIf this is the same person, be assured that you do not have to add this image because the information in this image has already been captured.");
                location.reload();
                return;
            } else {
                // If no issues, display a success message and reload the page to show updated details.
                alert("Profile updated successfully!");
                location.reload();
            }
        })
        .catch(error => {
            alert("Error updating the profile\n", error);
            location.reload();
        });
}


document.addEventListener("DOMContentLoaded", async function () {
    // Check if the user is signed in once page loads 
    checkAuthState();

    var uploadButton = document.getElementById("uploadButton");
    var newPortrait = document.getElementById("newPortrait");
    var updateButton = document.getElementById("update");
    // Fetch and display profile details once the page loads.
    var profile = await fetchProfile();
    displayProfile(profile);

    // When the upload button is clicked, trigger newPortrait to open the file explorer.
    uploadButton.addEventListener("click", function (event) {
        event.preventDefault();
        newPortrait.click();
    });

    // Once an image is selected, display the image and update fileName.
    newPortrait.addEventListener("change", function () {
        displayImage(newPortrait);
    });

    // When the update button is clicked, update the profile with the new details.
    updateButton.addEventListener("click", function (event) {
        event.preventDefault();
        updateProfile(profile);
    });
});