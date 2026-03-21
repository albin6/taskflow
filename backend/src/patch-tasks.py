import sys

filepath = r'c:\Albin\taskflow\backend\src\tasks\tasks.service.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
skip = False
for i, line in enumerate(lines):
    if 'if (updateTaskDto.assigneeId !== undefined) {' in line and i > 120:
        output.append('''    if (updateTaskDto.assigneeId !== undefined) {
      if (updateTaskDto.assigneeId === null) {
          task.assignee = null;
          task.assigner = null;
      } else {
          const assignee = await this.userRepository.findOne({ where: { id: updateTaskDto.assigneeId }, relations: ['role', 'team'] });
          if (!assignee) throw new NotFoundException(`Assignee with ID "${updateTaskDto.assigneeId}" not found.`);
          if (assignee.team?.id !== task.team?.id) {
             throw new ConflictException('Assignee must belong to the same team.');
          }

          // Hierarchy Check
          const assigneeLevel = assignee.role?.level ?? 99;
          if (assigneeLevel < actor.level) {
             throw new ForbiddenException('Cannot assign tasks to members with a higher role level.');
          }

          task.assignee = assignee;
          task.assigner = { id: actor.userId } as any; // Record new assigner
      }
    }\n''')
        skip = True
        continue
    if skip and 'return this.taskRepository.save(task);' in line:
        skip = False
    if not skip:
        output.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(output)

print("✅ Patched assigneeId update block successfully.")
