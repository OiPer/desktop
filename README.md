# OiPer: private voice-to-text for Windows, macOS and Linux

[OiPer](https://oiper.com) is a desktop voice dictation app. Hold a global hotkey, speak, release, and your words are typed into whatever app has focus: your editor, terminal, browser, chat or email.

Transcription runs locally with Whisper models on your CPU or GPU, so your audio never leaves your device. Local transcription is free and unlimited.

**[Download OiPer](https://oiper.com/download)** · [Documentation](https://oiper.com/docs) · [Changelog](https://oiper.com/resources/changelog)

## Features

- **Works in any app:** dictate into VS Code, Cursor, the terminal, Slack, Gmail, Notion or anything else with a text field.
- **Private by default:** offline speech-to-text with local Whisper models.
- **Cloud when you want it:** bring your own provider and API key, or use OiPer's hosted models on a paid plan.
- **AI formatting:** clean up, rewrite or translate the transcript before it is typed.
- **Dictionary:** teach OiPer names, jargon and technical terms so they are spelled correctly.
- **Snippets:** turn short spoken shortcuts into longer text.
- **Profiles:** separate hotkeys, languages and transcription modes for different kinds of work.
- **History:** review past dictations and play back the recorded audio.

## Supported platforms

| Platform | Builds                                    |
| -------- | ----------------------------------------- |
| Windows  | Installer                                 |
| macOS    | Apple Silicon and Intel (10.15 or later)  |
| Linux    | AppImage, `.deb`, `.rpm` (X11 and Wayland) |

On Linux, OiPer types the transcript with a system tool. Install one of them: `wtype`, `kwtype`, `dotool` or `ydotool` on Wayland, or `xdotool` or `ydotool` on X11.

## Quick start

1. [Download OiPer](https://oiper.com/download) for your platform, or grab it from [Releases](https://github.com/OiPer/desktop/releases/latest).
2. Open OiPer and follow the setup to pick a speech model and a hotkey.
3. Hold the hotkey, speak, and release. The text is typed into the active app.

The [quickstart guide](https://oiper.com/docs/desktop/quickstart) walks through each step.

## Privacy

- Local transcription runs entirely on your machine.
- History, audio and settings are stored on your device.
- Cloud transcription and AI formatting are optional.

Read more in [Security & Data Handling](https://oiper.com/resources/security) and the [Privacy Policy](https://oiper.com/resources/privacy-policy).

## Troubleshooting

### macOS: "OiPer is damaged" or the app won't open

If macOS blocks the app or reports it as damaged, run this in Terminal to remove the quarantine attribute:

```sh
xattr -rd com.apple.quarantine /Applications/OiPer.app
```

### macOS: permissions not working after an update

After an update you may need to grant permissions again. Even if OiPer already appears as allowed (for example under Microphone or Accessibility), remove the entry and add it again.

More fixes are in the [troubleshooting guide](https://oiper.com/docs/desktop/troubleshooting).

## Help and feedback

- [Report a bug or request a feature](https://github.com/OiPer/desktop/issues)
- [Ask a question or share an idea](https://github.com/OiPer/desktop/discussions)
- Email: support@oiper.com
