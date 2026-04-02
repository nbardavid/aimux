Output assets/sessions.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 0
Set Theme "Dracula"
Set TypingSpeed 40ms

# Start aimux
Type "bun run start"
Enter
Sleep 2s

# Session picker on startup -- create a session
Type "n"
Sleep 500ms

# Search for a project directory
Type "aimux"
Sleep 1s

# Select the directory
Enter
Sleep 500ms

# Confirm session name
Enter
Sleep 1.5s

# Open session picker again
Ctrl+G
Sleep 500ms

# Create a second session
Type "n"
Sleep 500ms
Type "other"
Sleep 1s
Enter
Sleep 500ms
Enter
Sleep 1.5s

# Open session picker to switch
Ctrl+G
Sleep 500ms

# Filter sessions by name
Type "/"
Sleep 300ms
Type "aimux"
Sleep 500ms
Enter
Sleep 300ms

# Select and switch to filtered session
Enter
Sleep 1.5s

# Rename the session
Ctrl+G
Sleep 500ms
Type "r"
Sleep 300ms
Type "my-project"
Enter
Sleep 1s

Escape
Sleep 500ms

# Exit
Ctrl+C
Sleep 500ms
