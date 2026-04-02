Output assets/tabs.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 0
Set Theme "Dracula"
Set TypingSpeed 40ms

# Start aimux (assume a session already exists)
Type "bun run start"
Enter
Sleep 2s

# Create session if needed
Type "n"
Sleep 500ms
Type "aimux"
Sleep 1s
Enter
Sleep 500ms
Enter
Sleep 1.5s

# Launch a Claude tab
Ctrl+N
Sleep 500ms
Enter
Sleep 3s

# Enter input mode and send a message
Type "i"
Sleep 300ms
Type "Say hello in one sentence"
Enter
Sleep 4s

# Back to navigation
Ctrl+Z
Sleep 500ms

# Open another tab
Ctrl+N
Sleep 500ms
Enter
Sleep 3s

# Rename the tab
Type "r"
Sleep 300ms
Type "code-review"
Enter
Sleep 500ms

# Navigate tabs with j/k
Type "k"
Sleep 500ms
Type "j"
Sleep 500ms

# Reorder tabs with Shift+J
Type "J"
Sleep 500ms
Type "K"
Sleep 500ms

# Toggle sidebar
Ctrl+B
Sleep 500ms
Ctrl+B
Sleep 500ms

# Show help
Type "?"
Sleep 1.5s
Escape
Sleep 500ms

# Exit
Ctrl+C
Sleep 500ms
