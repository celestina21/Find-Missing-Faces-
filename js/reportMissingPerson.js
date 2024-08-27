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
            //  After successful log out, clear the local storage to get rid of precious tokens and display a message
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


// This function displays the selected image.
function displayImage(input) {
    var validFormats = ["image/jpeg", "image/png"];
    var portraitSide = document.getElementById("portraitSide");
    var existingImage = document.getElementById("uploadedPortrait");
    var image = document.createElement("img");
    image.id = "uploadedPortrait";
    var file = input.files[0];

    if (file) {
        // If the file selected is of an invalid file type for Amazon Rekognition, reject it and alert the user.
        if (!validFormats.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG).");
            return;
        }

        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            image.src = reader.result;
        };

        // Replace existing image if there is one.
        if (existingImage) {
            portraitSide.replaceChild(image, existingImage);
        } else {
            portraitSide.appendChild(image);
        }
    }
}

// This function checks if the character is an alphabet.
function checkForAlphabet(character) {
    return /^[a-zA-Z\s]+$/.test(character);
}

// This function validates user inputs before adding the profile to the database.
// This function will use Amazon RDS to add the profile to the database and Amazon S3 to store the image.
// It will also use Amazon Rekognition to generate face_id and Amazon SNS to generate topic_arn.
function addProfile() {
    var feedback = "";

    // image variable will be used to check if an image has been uploaded. Will not be part of the row added to the database
    var image = document.getElementById("portraitInput").files[0];
    var name = document.getElementById("name").value.trim();
    var last_location = document.getElementById("last_location").value.trim();
    var last_seen_date = document.getElementById("last_seen_date").value;
    var description = document.getElementById("description").value.trim();
    var contact = document.getElementById("contact").value.trim();

    if (image === null) {
        feedback += "Please upload a portrait.\n";
    }
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

    // Convert the image to base64 encoded string
    var reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = function () {
        // Get the base64 encoded image
        image = reader.result.split(",")[1];
        // Create a profile object with the user inputs
        var profile = {
            name: name,
            image: image,
            last_location: last_location,
            last_seen_date: last_seen_date,
            description: description,
            contact: contact,
        };

        // Add the profile to the database
        fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/add", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // Send the profile object to the API
            body: JSON.stringify(profile)
        })
            .then(response => {
                if (!response.ok) {
                    // If response status is not status 200, display the error message and do not proceed
                    return response.json().then(error => {
                        alert(`Error: ${JSON.stringify(error.error)}`);
                        return null
                    });
                } else {
                    // Parse the JSON from the response
                    return response.json();
                }
            })
            .then(data => {
                // If the response contains a message of an issue, display the message
                if (data.message) {
                    if (data.message === "No faces detected in the image") {
                        alert("No faces detected in the image. Please submit a clear portrait.");
                        location.reload();
                        return;
                    } else if (data.message === "This face is already in our database!") {
                        alert("This face is already in our database! Please submit a different portrait.");
                        location.reload();
                        return;
                    }
                } else {
                    // Access the key value from the response data
                    var key = data.key;
                    // Inform the user of the key
                    alert(`This profile's key is ${key}.\nPlease keep this key safe, as it will be required to edit or delete the profile.\nREVEAL ONLY TO TRUSTED INDIVIDUALS.`);
                    location.reload();
                }
            })
            .catch(error => {
                // Handle any errors that occurred during the fetch operation
                alert(`Error trying to add profile to the database\n${error}\n{Please try again. Maybe the image was not of a proper format or was too blurry?}`);
                location.reload();
            });
    };
}

document.addEventListener("DOMContentLoaded", function () {
    var dateInput = document.getElementById("last_seen_date");
    var uploadButton = document.getElementById("uploadButton");
    var portraitInput = document.getElementById("portraitInput");
    var submitButton = document.getElementById("submit");

    var currentDate = new Date();
    var year = currentDate.getFullYear();
    var day = currentDate.getDate();
    var month = currentDate.getMonth() + 1;
    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }
    var maxDate = `${year}-${month}-${day}`;
    // Set the max date for the date input to the current date.
    dateInput.max = maxDate;

    // When the upload button is clicked, trigger the portraitInput to open the file explorer
    uploadButton.addEventListener("click", function (event) {
        event.preventDefault();
        portraitInput.click();
    });

    // Once an image is selected, display the image.
    portraitInput.addEventListener("change", function () {
        displayImage(portraitInput);
    });

    // When the submit button is clicked, add the profile to the database. 
    submitButton.addEventListener("click", function (event) {
        event.preventDefault();
        addProfile();
    });
});