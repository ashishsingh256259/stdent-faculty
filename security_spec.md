# EduBridge Security Specification

## Data Invariants
1. Students cannot create classrooms.
2. Only-teachers can create polls.
3. Users can only see classrooms they are members of (or profiles).
4. Users cannot modify other users' profiles.
5. Anonymous questions must still have an `authorId` for internal tracking, but the UI hides it.
6. A user can only vote once on a poll (enforced by userId as document ID in responses).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Privilege Escalation**: A student trying to create a classroom.
3. **Ghost Classroom**: Creating a classroom with a different teacherId than the actual user.
4. **Member Hijack**: Adding another user to a classroom without permission.
5. **Question Spam**: Asking a question in a classroom the user isn't part of.
6. **Vote Stuffing**: Attempting to vote multiple times on a poll.
7. **Answer Forgery**: A student marking a question as "answered".
8. **Poll Manipulation**: A student attempting to close a poll.
9. **Profile Corruption**: Updating another user's email or role.
10. **Shadow Field Injection**: Adding an `isAdmin` field to a user profile.
11. **ID Poisoning**: Using a 2KB string as a classroom ID.
12. **Status Shortcut**: Marking a question as answered during creation.

## Test Runner (Mock Tests)
- `it('rejects profile creation for other UID')`
- `it('rejects student creating classroom')`
- `it('rejects voting in non-member classroom')`
- `it('rejects multiple votes by same user')`
