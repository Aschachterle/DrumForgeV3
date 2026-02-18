#!/usr/bin/env python3

import requests
import json
from src.config import config

# Get access token
token_url = "https://developer.api.autodesk.com/authentication/v2/token"
auth_data = {
    "client_id": config["CLIENT_ID"],
    "client_secret": config["CLIENT_SECRET"],
    "grant_type": "client_credentials",
    "scope": "code:all"
}
print(f"Getting token from {token_url}...")
token_response = requests.post(token_url, data=auth_data)
token_data = token_response.json()
access_token = token_data["access_token"]
print(f"Got token: {access_token[:20]}...")

# Create AppBundle
url = "https://developer.api.autodesk.com/da/us-east/v3/appbundles"
payload = {
    "id": "DrumModifierAppBundle",
    "engine": "Autodesk.Fusion+Latest",
    "description": "DrumForge - Fusion 360 Drum Parameter Modifier Plugin"
}
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "X-Autodesk-Personal-Access-Token": config["PERSONAL_ACCESS_TOKEN"]
}

print(f"\nCreating AppBundle at {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")
response = requests.post(url, json=payload, headers=headers)
print(f"\nStatus: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")
