// Prompt the user to enter the verification code
function requestVerificationCode(username, password) {
    var code = prompt("Please enter the verification code sent to your email:");
    if (code) {
        confirmEmail(username, password, code);
    } else {
        // If the user cancels, continue prompting them to confirm their 
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
                // If email confirmation is successful, store tokens and redirect
                localStorage.setItem("idToken", data.idToken);
                localStorage.setItem("accessToken", data.accessToken);
                alert("Email confirmed!");
                location.href = "index.html";
            }
        })
        .catch(error => {
            alert("Email confirmation failed.");
            alert("Error\n" + error);
        });
}


// Confirm email address then sign up new user
function signUp(username, email, password) {
    fetch("https://yps94q60xa.execute-api.us-east-1.amazonaws.com/findmissingfaces_test/authentication", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "signUp",
            username: username,
            email: email,
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
                alert(data.message);
            } else {
                // If no issues, prompt the user to enter the verification code sent to their email
                requestVerificationCode(username, password);
            }
        })
        .catch(error => {
            alert("Sign up failed.");
            alert("Error\n" + error);
        });
}


document.addEventListener("DOMContentLoaded", function () {
    var signUpButton = document.getElementById("signup");

    signUpButton.addEventListener("click", function (event) {
        event.preventDefault();

        var username = document.getElementById("username").value;
        var email = document.getElementById("email").value;
        var password = document.getElementById("password").value;
        var confirmPassword = document.getElementById("confirmPassword").value;

        // Check if all fields are filled in
        if (username && email && password) {
            // Check if the passwords match
            if (password !== confirmPassword) {
                // If the passwords do not match, alert the user and do not proceed
                alert("Passwords do not match");
                return;
            } else {
                // If the passwords match, sign up the user
                signUp(username, email, password);
            }
        } else {
            // If not all fields are filled in, alert the user and do not proceed
            alert("Please fill in all fields");
        }
    });
});
