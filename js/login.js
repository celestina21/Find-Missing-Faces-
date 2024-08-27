// Update the placeholder text based on the selected login method (username or email)
function updatePlaceholder() {
    var loginIdentifier = document.getElementById("identifier");
    var selectedValue = document.querySelector('input[name="loginMethod"]:checked').value;
    if (selectedValue === "username") {
        loginIdentifier.placeholder = "Username";
    } else {
        loginIdentifier.placeholder = "Email";
    }
}


// Prompt the user to enter the verification code
function requestVerificationCode(username, password) {
    var code = prompt("Please enter the verification code sent to your email:");
    if (code) {
        confirmEmail(username, password, code);
    } else {
        // If the user cancels, continue prompting them to confirm their email
        alert("You must enter the verification code to confirm your email.");
        requestVerificationCode(username, password);
    }
}


// Confirm the user's email address using the provided code
function confirmEmail(username, password, code) {
    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/authentication", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "confirmEmail",
            username: username,
            password: password,
            code: code
        })
    })
        .then(response => {
            if (!response.ok) {
                // If response status is not status 200, display the error message
                return response.json().then(error => {
                    alert(`Error: ${JSON.stringify(error)}`);
                    return null;
                });
            } else {
                return response.json();
            }
        })
        .then(data => {
            // If the response contains a message of an issue, display the message
            if (data.message) {
                alert(data.message);
                // If the message contains "Please try again.", allow the user to enter a new verification code
                if (data.message.includes("Please try again.")) {
                    var newCode = prompt("Please enter the new verification code sent to your email:");
                    // If the user enters a new verification code, call the confirmEmail function again
                    if (newCode) {
                        confirmEmail(username, password, newCode);
                    } else {
                        // If the user cancels, continue prompting them to confirm their email
                        alert("You must enter the verification code to confirm your email.");
                        requestVerificationCode(username, password);
                    }
                }
            } else {
                // If no issues, alert the user that their email has been confirmed and return true
                alert("Email confirmed!");
                // Sign in the user after email confirmation using their username and password
                signIn(username, password);
            }
        })
        .catch(error => {
            alert("Email confirmation failed.");
            alert("Error\n" + error);
        });
}


// Sign in a user using their username/email and password
function signIn(identifier, password) {
    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/authentication", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        // Send the action to be done, username/email, and password to the API
        body: JSON.stringify({
            action: "signIn",
            identifier: identifier,
            password: password
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
            // If the response contains a message of an issue, display the message
            if (data.message) {
                // If the user's email is not verified, prompt the user to verify it 
                if (data.message.includes("Email not confirmed")) {
                    alert("Email address not verified.\nPlease verify your email address now.");
                    // If the identifier is an email, access the username from data.username
                    if (identifier.includes("@")) {
                        requestVerificationCode(data.username, password);
                        // If the identifier is a username, use the identifier directly 
                    } else {
                        requestVerificationCode(identifier, password);
                    }
                }
                alert(data.message);
            } else {
                // If no issues, store the tokens and username in local storage and redirect to the home page
                localStorage.setItem("accessToken", data.accessToken);
                alert("Login successful!");
                location.href = "index.html";
            }
        })
        .catch(error => {
            alert("Sign in failed.");
            alert("Error\n", error);
        });
}


document.addEventListener("DOMContentLoaded", function () {
    var loginButton = document.getElementById("login");
    var radioButtons = document.querySelectorAll('input[name="loginMethod"]');

    // Add event listeners to the radio buttons to update the placeholder text
    radioButtons.forEach(function (radio) {
        radio.addEventListener("change", updatePlaceholder);
    });

    // Initialize the placeholder on page load
    updatePlaceholder();

    // Add event listener to the login button to sign in the user
    loginButton.addEventListener("click", function (event) {
        event.preventDefault();

        // Get the values of the identifier (username/email), password, and login method
        var identifier = document.getElementById("identifier").value;
        var password = document.getElementById("password").value;
        var loginMethod = document.querySelector('input[name="loginMethod"]:checked').value;

        // Check if all fields are filled in
        if (identifier && password) {
            // Sign in the user
            signIn(identifier, password, loginMethod);
        } else {
            // If not all fields are filled in, alert the user and do not proceed
            alert("Please fill in all fields");
        }
    });
});

