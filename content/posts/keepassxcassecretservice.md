---
title: "KeepassXC as Secret Service"
summary: ""
authors: ["thomas"]
tags: ["linux", "keepass", "debian"]
categories: []
date: 2022-07-22 09:37:00
---

When running the Gnome Desktop Environment on Debian there is a secrets tool
that automatically runs called Gnome Keyring. This tool provides multiple
functions:

- ssh keys - ssh keys in ~/.ssh with passwords that match the login password are
  unlocked at login time via pam and added to a ssh-agent (the gnome keyring
  agent not the original openssh agent one)
- general secrets via dbus - the secret service is accessed via dbus. The
  secrets are stored in an encrypted file (~/.local/share/keyrings), this file
  is also unlocked at login time via pam. The secrets are available via
  libsecret. So for example nextcloud login passwords are stored in this store.
  Also if it's not been unlocked at login time, for instance if login via
  fingerprint is used access via dbus starts the gnome-keyring-daemon and the
  user is prompted for the password.
- pki - gnome-keyring also stores pki certificates, I've not used this much, but
  I assume its a location to store certificates: custom CA's, machine and user
  certificates.

There are many tools to then use the above, seahorse is a gui tool and
secret-tool is a cli tool.

The idea being that ssh key passwords and general passwords are stored in
encrypted files on disk, albeit with the same password as login.

## The Problem

- changing passwords is hard, eg have to update password for
  ~/.local/share/keyrings
- logging in via fingerprint
- ssh keys only when keepass unlocked
- ansible secrets, aws secrets, etc end up in ~/.local/share/keyrings across
  laptops
- easier to keep an handle on in just keepass files

## Mods

Notes on changes

```
systemctl --user mask gnome-keyring-daemon.service
systemctl --user mask gnome-keyring-daemon.socket

.config/autostart/gnome-keyring-pkcs11.desktop
.config/autostart/gnome-keyring-secrets.desktop
.config/autostart/gnome-keyring-ssh.desktop

pam-auth-update remove gnome-keyring

/etc/pam.d/gdm-password


/home/thomas/.local/share/dbus-1/services/org.freedesktop.impl.portal.Secret.service:[D-BUS Service]
/home/thomas/.local/share/dbus-1/services/org.freedesktop.impl.portal.Secret.service:Name=org.freedesktop.impl.portal.Secret
/home/thomas/.local/share/dbus-1/services/org.freedesktop.impl.portal.Secret.service:Exec=/usr/bin/keepassxc
/home/thomas/.local/share/dbus-1/services/org.freedesktop.secrets.service:[D-BUS Service]
/home/thomas/.local/share/dbus-1/services/org.freedesktop.secrets.service:Name=org.freedesktop.secrets
/home/thomas/.local/share/dbus-1/services/org.freedesktop.secrets.service:Exec=/usr/bin/keepassxc
/home/thomas/.local/share/dbus-1/services/org.gnome.keyring.service:[D-BUS Service]
/home/thomas/.local/share/dbus-1/services/org.gnome.keyring.service:Name=org.gnome.keyring
/home/thomas/.local/share/dbus-1/services/org.gnome.keyring.service:Exec=/usr/bin/keepassxc

```

## URLs

https://wiki.archlinux.org/title/GNOME/Keyring
https://gitlab.freedesktop.org/xdg/xdg-specs/-/issues/75
https://github.com/keepassxreboot/keepassxc/issues/6274
https://rtfm.co.ua/en/what-is-linux-keyring-gnome-keyring-secret-service-and-d-bus/
