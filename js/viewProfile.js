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

    // Fetch the profile from the database using the profile ID
    return fetch(`https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/${profileId}`)
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
        .catch(error => {
            alert("Error fetching profile from the database\n", error);
            return null;
        });
}

// Function to display profile details on the page.
function displayProfile(profile) {
    if (profile) {
        var portraitUrl = profile.portrait;
        // Append a cache-busting query parameter to the URL
        var timestamp = new Date().getTime();
        portraitUrl += `?t=${timestamp}`;
        document.getElementById("portrait").src = portraitUrl;
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

// Function to create the form to enter the missing person's unique key for verification.
function createAuthorisationForm() {
    var editButton = document.getElementById("editProfile");

    var deleteButton = document.getElementById("deleteProfile");

    var keyInputForm = document.createElement("div");
    keyInputForm.id = "keyInputForm";

    var keyInputLabel = document.createElement("label");
    keyInputLabel.for = "key";
    keyInputLabel.textContent = "Enter the missing person's unique key, then press 'Enter' to confirm:";

    var keyInputSpace = document.createElement("input");
    keyInputSpace.type = "text";
    keyInputSpace.id = "key";

    var closeButton = document.createElement("button");
    closeButton.id = "closeButton";
    closeButton.textContent = "Close";

    // When close button is clicked, the form is removed and edit and delete buttons are re-enabled.
    closeButton.addEventListener("click", function () {
        keyInputForm.remove();
        editButton.disabled = false;
        deleteButton.disabled = false;
    });

    keyInputForm.appendChild(keyInputLabel);
    keyInputForm.appendChild(keyInputSpace);
    keyInputForm.appendChild(closeButton);
    document.getElementById("formSide").appendChild(keyInputForm);
}

// This function will use Amazon RDS API to delete the profile from the MySQL profiles database using its person_id. 
function deleteProfile(profile) {
    var editButton = document.getElementById("editProfile");
    var deleteButton = document.getElementById("deleteProfile");
    var keyInputForm = document.getElementById("keyInputForm");
    var confirmDelete = confirm(`Are you sure you want to delete ${profile.name}'s profile?`);
    if (confirmDelete) {
        // Delete the profile from the database using the person_id
        fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/profiles/delete", {
            method: "DELETE",
            // Send the person_id of the profile to be deleted
            body: JSON.stringify({
                person_id: profile.person_id
            }),
        })
            .then(response => {
                if (!response.ok) {
                    // If response status is not status 200, display the error message and do not proceed
                    return response.json().then(error => {
                        alert(`Error: ${JSON.stringify(error.error)}`);
                        return null;
                    });
                }
                // Parse the JSON from the response
                return response.json();
            })
            .then(responseData => {
                // Inform the user of successful deletion
                alert("Profile deleted.");
                // Redirect to home page upon successful deletion.
                window.location.href = "index.html";
            })
            .catch(error => {
                // Handle network errors or other issues
                alert("Error trying to delete the profile\n", error);
            });
    } else {
        alert("Profile deletion cancelled.");
        // Re-enable edit and delete buttons and remove the keyInputForm if the deletion is cancelled.
        deleteButton.disabled = false;
        editButton.disabled = false;
        keyInputForm.remove();
    }
}

// Function to handle authorization for edit or delete actions.
// It takes in the missing person's profile to use its person_id for navigating to the right edit page, deleting the profile and using its key to verify the user's inputted key.
// It also takes in the action (edit or delete) to determine the action to be taken if the inputted key is correct.
function handleAuthorization(profile, action) {
    createAuthorisationForm();
    var keyInputForm = document.getElementById("keyInputForm");
    var keyInput = document.getElementById("key");
    var editButton = document.getElementById("editProfile");
    var deleteButton = document.getElementById("deleteProfile");

    // Disable edit and delete buttons so that duplicate forms won't be created.
    editButton.disabled = true;
    deleteButton.disabled = true;

    // When the Enter key is pressed, validate the key entered.
    keyInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            if (keyInput.value === profile.key) {
                // Redirect to edit profile page if the key is correct and the user wants to edit the profile.
                if (action === "edit") {
                    window.location.href = `editProfile.html?id=${profile.person_id}`;
                    // Call deleteProfile() if the key is correct and the user wants to delete the profile.
                } else if (action === "delete") {
                    deleteProfile(profile);
                }
            } else {
                // Alert the user if the key entered is incorrect, then remove the keyInputForm and re-enable edit and delete buttons.
                alert("Invalid key.");
                keyInputForm.remove();
                editButton.disabled = false;
                deleteButton.disabled = false;
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    checkAuthState();

    var editButton = document.getElementById("editProfile");
    var deleteButton = document.getElementById("deleteProfile");

    // Fetch and display profile details once the page loads.
    var profile = await fetchProfile();
    displayProfile(profile);

    // When editButton is clicked, handle authorization, specfying action as "edit".
    editButton.addEventListener("click", function () {
        handleAuthorization(profile, "edit");
    });

    // When deleteButton is clicked, handle authorization, specifying action as "delete".
    deleteButton.addEventListener("click", function () {
        handleAuthorization(profile, "delete");
    });
});