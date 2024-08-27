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


// Function to display the selected image.
// Returns boolean of whether or not image upload was a success depending on if the file is of a valid format.
function displayImage(input) {
    var validFormats = ["image/jpeg", "image/png"];
    var imageSide = document.getElementById("imageDisplay");
    var image = document.createElement("img");
    image.id = "uploadedImage";
    // Create a canvas to draw bounding boxes around detected faces
    var canvas = document.createElement("canvas");
    canvas.id = "boundingBoxCanvas";
    var file = input.files[0];

    if (file) {
        // If the file selected is of an invalid file type for Amazon Rekognition, reject it and alert the user.
        if (!validFormats.includes(file.type)) {
            alert("Please upload a valid image file (JPEG, PNG).");
            return false;
        }

        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            image.src = reader.result;
            // Set up canvas after image is loaded
            image.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height;
                imageSide.appendChild(canvas);
            }
        };
        imageSide.appendChild(image);
    }
    return true;
}


// Draw bounding boxes around detected faces in the image.
function drawBoundingBoxes(boundingBoxes) {
    var canvas = document.getElementById("boundingBoxCanvas");
    var ctx = canvas.getContext("2d");

    // Clear the canvas before drawing new bounding boxes
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boundingBoxes.forEach(box => {
        var Left = box.Left;
        var Top = box.Top;
        var Width = box.Width;
        var Height = box.Height;

        // Draw bounding box
        ctx.beginPath();
        ctx.rect(Left * canvas.width, Top * canvas.height, Width * canvas.width, Height * canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "red";
        ctx.stroke();
        ctx.closePath();
    });
}


// Variable to manage the state of the close button.
var closeButtonPressed = false;


// Function to display a profile for each missing person match.
function createProfile(similarity, portraitSrc, name, last_location, last_seen_date, description, contact, topic_arn) {
    var uploadSide = document.getElementById("uploadSide");

    var profile = document.createElement("div");
    profile.className = "profile";

    var portrait = document.createElement("img");
    portrait.className = "portrait";
    portrait.src = portraitSrc;

    var details = document.createElement("div");
    details.className = "details";

    var similarityScore = document.createElement("h2");
    similarityScore.className = "similarityScore";
    similarityScore.textContent = `${similarity.toFixed(2)}% match`;

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

    var descriptionText = document.createElement("p");
    descriptionText.className = "description";
    descriptionText.textContent = description;

    var notifyButton = document.createElement("button");
    notifyButton.textContent = "Notify Contact";

    // Function to re-enable notifyButton when the form is closed so that user can click it again.
    function onClose() {
        closeButtonPressed = true;
        notifyButton.disabled = false;
    }

    // When notifyButton is clicked, it creates a form to enter image details to be sent to the contact.
    notifyButton.addEventListener("click", function () {
        // onClose is passed in to be called when the form is closed to re-enable notifyButton.
        createImageDetailsForm(name, last_seen_date, topic_arn, onClose);
        uploadSide.scrollTop = uploadSide.scrollHeight
        // Disable notifyButton after form is created so that duplicate form will not be created if notifyButton is clicked again.
        // notifyButton should only be enabled if a message has not been sent to the person's contact or if the form is closed.
        notifyButton.disabled = true;
    });

    details.appendChild(similarityScore);
    details.appendChild(nameHeading);
    details.appendChild(lastSeen);
    details.appendChild(contactNumber);
    details.appendChild(descriptionText);
    details.appendChild(notifyButton);

    profile.appendChild(portrait);
    profile.appendChild(details);

    return profile;
}


// Function using Amazon Rekognition API to get the similarity scores for the uploaded image and the missing peoples' portraits, then display the top 3 matches.
function getMatches(file) {
    // Create a new FileReader to read the image file
    var reader = new FileReader();

    reader.onload = function (event) {
        // Extract base64 data from Data URL
        var base64Data = event.target.result.split(",")[1];

        fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/analyse-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // Send the base64 data of the image to the API
            body: JSON.stringify({ scene_image: base64Data })
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
                // If the response contains a message of an issue, display the message
                if (data.message) {
                    if (data.message === "No matches found") {
                        alert("Sorry, we couldn't find any matches in this image to missing people in our database :(");
                        return;
                    } else if (data.message.startsWith("Failed to process image")) {
                        alert(`Sorry, we couldn't process this image. Please try again with a different image.\n\n${data.message}`);
                        return;
                    }
                } else {
                    // If no issues, create a profile for each match
                    var matches = document.createElement("div");
                    matches.id = "matches";
                    var boundingBoxes = [];

                    for (var match of data) {
                        missingPerson = match.missingPerson;
                        var profile = createProfile(match.similarityScore, missingPerson.portrait, missingPerson.name, missingPerson.last_location, missingPerson.last_seen_date, missingPerson.description, missingPerson.contact, missingPerson.topic_arn);
                        matches.appendChild(profile);
                        boundingBoxes.push(match.boundingBox); // Collect bounding boxes
                    }
                    document.getElementById("uploadSide").appendChild(matches);
                    // Draw bounding boxes after all profiles have been added
                    drawBoundingBoxes(boundingBoxes);
                }
            })
            .catch(error => {
                alert("Error trying to analyse the image\n", error);
                location.reload();
            });
    };
    reader.readAsDataURL(file);
}


// Function to create a form for image details that are sent to the contact of the missing person.
// It takes in the name of the missing person, their last seen date and the onClose function that manages notifyButton state.
function createImageDetailsForm(missingPerson, personLastSeenDate, topic_arn, onClose) {
    var profilesSpace = document.getElementById("matches");
    var imageDetailsTitle = document.createElement("h2");
    imageDetailsTitle.innerHTML = `Enter image"s details to send to <span id="missingPerson">${missingPerson}'s</span> contact.`;

    var imageDetails = document.createElement("div");
    imageDetails.id = "imageDetailsFormSpace";
    var imageDetailsForm = document.createElement("form");

    var imageLocationLabel = document.createElement("label");
    imageLocationLabel.textContent = "Enter image location";
    imageLocationLabel.htmlFor = "imageLocation";
    var imageLocation = document.createElement("input");
    imageLocation.type = "text";
    imageLocation.id = "imageLocation";
    imageLocation.required = true;
    imageLocation.minLength = 10;
    imageLocation.maxLength = 100;

    personLastSeenDate = new Date(personLastSeenDate);

    var currentDateTime = new Date();
    var year = currentDateTime.getFullYear();
    var month = currentDateTime.getMonth() + 1;
    var day = currentDateTime.getDate();
    var hours = currentDateTime.getHours();
    var minutes = currentDateTime.getMinutes();
    if (month < 10) {
        month = "0" + month;
    }
    if (day < 10) {
        day = "0" + day;
    }
    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    var lastSeenMonth = personLastSeenDate.getMonth() + 1
    var lastSeenDay = personLastSeenDate.getDate();
    if (lastSeenMonth < 10) {
        lastSeenMonth = "0" + lastSeenMonth;
    }
    if (lastSeenDay < 10) {
        lastSeenDay = "0" + lastSeenDay;
    }

    // Set the timing of when the person was last seen to 12 AM.
    var defaultTime = "00:00";
    // Minimum date will be when the person was last seen as only images from after they've gone missing will be useful.
    var minDate = `${personLastSeenDate.getFullYear()}-${lastSeenMonth}-${lastSeenDay}T${defaultTime}`;
    // Maximum date will be the current date and time.
    var maxDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    var imageDateTimeLabel = document.createElement("label");
    imageDateTimeLabel.textContent = "Enter image date and time";
    imageDateTimeLabel.htmlFor = "imageDateTime";
    var imageDateTime = document.createElement("input");
    imageDateTime.type = "datetime-local";
    imageDateTime.id = "imageDateTime";
    imageDateTime.required = true;
    imageDateTime.min = minDate;
    imageDateTime.max = maxDate;

    var additonalCommentsLabel = document.createElement("label");
    additonalCommentsLabel.textContent = "Additional comments";
    additonalCommentsLabel.htmlFor = "additionalComments";
    var additionalComments = document.createElement("textarea");
    additionalComments.id = "additionalComments";
    additionalComments.placeholder = "Other details regarding the photo. You may even offer your contact information as well if you would like them to reach out to you.";
    additionalComments.maxLength = 500;

    var submitButton = document.createElement("button");
    submitButton.type = "button";
    submitButton.className = "sendButton";
    submitButton.textContent = "Send";

    // When submitButton is clicked, it calls sendMessage() to validate the inputs and send the message to the contact.
    submitButton.addEventListener("click", function (event) {
        event.preventDefault();
        var imageLocationValue = imageLocation.value.trim();
        var imageDateTimeValue = imageDateTime.value;
        var additionalCommentsValue = additionalComments.value.trim();
        sendMessage(missingPerson, topic_arn, imageLocationValue, imageDateTimeValue, additionalCommentsValue);
    });

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "closeButton";
    closeButton.textContent = "Close";

    // When closeButton is clicked, it calls onClose() to re-enable the notifyButton. 
    closeButton.addEventListener("click", function () {
        onClose();
        closeButtonPressed = false;
        imageDetails.remove();
    });

    imageDetailsForm.appendChild(imageLocationLabel);
    imageDetailsForm.appendChild(imageLocation);
    imageDetailsForm.appendChild(imageDateTimeLabel);
    imageDetailsForm.appendChild(imageDateTime);
    imageDetailsForm.appendChild(additonalCommentsLabel);
    imageDetailsForm.appendChild(additionalComments);
    imageDetailsForm.appendChild(closeButton);
    imageDetailsForm.appendChild(submitButton);

    imageDetails.appendChild(imageDetailsTitle);
    imageDetails.appendChild(imageDetailsForm);

    profilesSpace.appendChild(imageDetails);
}


// This function checks if a character is an alphabet and returns a boolean.
function checkForAlphabet(character) {
    return /[a-zA-Z]/.test(character);
}


// This function validates user inputs for image details before sending the message to the contact.
// It takes in the missing person's name, the location of the image, when the image was taken, and any additional comments.
function sendMessage(missingPerson, topic_arn, imageLocation, imageDateTime, additionalComments) {
    var message = "";
    var feedback = "";

    if (imageLocation === "") {
        feedback += "Please fill in location details.\n";
    }
    if (imageDateTime === "") {
        feedback += "Please fill in date and time details.\n";
    }
    if (additionalComments === "") {
        additionalComments = null;
    }

    if (imageLocation.length < 10) {
        feedback += "Location details should be at least 10 characters long.\n";
    }

    var locationAlphabetCounter = 0;
    for (var character of imageLocation) {
        if (checkForAlphabet(character)) {
            locationAlphabetCounter += 1;
        } else if (locationAlphabetCounter === 5) {
            break;
        } else {
            continue;
        }
    }
    if (locationAlphabetCounter < 5) {
        feedback += "There should be at at least 5 letters in the location details.\n"
    }

    if (additionalComments !== null) {
        if (additionalComments.length < 20) {
            feedback += "Additional comments should be at least 20 characters long.\n";
        }
        var commentsAlphabetCounter = 0;
        for (var character of additionalComments) {
            if (checkForAlphabet(character)) {
                commentsAlphabetCounter += 1;
            } else if (commentsAlphabetCounter === 10) {
                break;
            } else {
                continue;
            }
        }
        if (commentsAlphabetCounter < 10) {
            feedback += "Your additional comments should contain at least 10 letters.\n"
        }
    }

    if (feedback) {
        alert(feedback);
        return;
    }

    var day = imageDateTime.slice(8, 10);
    var month = imageDateTime.slice(5, 7);
    var year = imageDateTime.slice(0, 4);
    // Convert hours to number to check if it is greater than 12.
    var hours = parseInt(imageDateTime.slice(11, 13));
    // If hours is greater than or equal to 12, period is PM, else set it to AM as it is in the morning.
    var period = 0;
    if (hours >= 12) {
        period = "PM";
    } else {
        period = "AM";
    }
    // Use modulo operator to get the remainder of hours divided by 12. This is to get the time in 12-hour format.
    hours = hours % 12;
    // If hour is 0, set it to 12 as it is 12 AM.
    if (hours === 0) {
        hours = 12;
    }
    var minutes = imageDateTime.slice(14, 16);

    var formattedDateTime = `${day}/${month}/${year} at ${hours}:${minutes} ${period}`;

    var confirmMessage = confirm("The message cannot be edited once sent.\nHave you verified the details you've entered?");
    if (!confirmMessage) {
        alert("Message not sent.");
        return;
    } else {
        if (additionalComments === null) {
            message = `A fellow user of Find Missing faces seems to have found ${missingPerson} in an image taken at ${imageLocation} on ${formattedDateTime}!`;
        } else {
            message = `A fellow user of Find Missing faces seems to have found ${missingPerson} in an image taken at ${imageLocation} on ${formattedDateTime}!\nAdditional comments: ${additionalComments}`;
        }

        // Send the message to the contact of the missing person.
        fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/notify-contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            // Send the topic ARN and the message to the API to send the message to the contact.
            body: JSON.stringify({
                topic_arn: topic_arn,
                message: message
            })
        })
            .then(response => response.json())
            .then(data => {
                // Remove the form after the message is sent 
                document.getElementById("imageDetailsFormSpace").remove();
                alert("Message sent successfully!");
            })
            .catch(error => {
                alert("Error trying to send the message\n", error);
            });
        return;
    }
}


document.addEventListener("DOMContentLoaded", function () {
    var uploadButton = document.getElementById("uploadButton");
    var imageInput = document.getElementById("imageInput");

    // When uploadButton is clicked, it triggers the imageInput to open the file explorer and disabled uploadButton.
    uploadButton.addEventListener("click", function () {
        imageInput.click();
        uploadButton.blur();
        uploadButton.disabled = true;
    });

    // Once an image is selected, display the image and the matches.
    imageInput.addEventListener("change", function () {
        var uploadSuccess = displayImage(imageInput);
        if (uploadSuccess) {
            getMatches(imageInput.files[0]);
        } else {
            uploadButton.disabled = false;
        }
    });
});
