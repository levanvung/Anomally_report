with open('src/assets/styles/components.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = """.machine-text .machine-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}"""

replacement = """.machine-text .machine-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
  max-width: calc(100% - 22px);
}"""

norm_content = content.replace('\r\n', '\n')
norm_target = target.replace('\r\n', '\n')
norm_replacement = replacement.replace('\r\n', '\n')

if norm_target in norm_content:
    new_content = norm_content.replace(norm_target, norm_replacement, 1)
    if '\r\n' in content:
        new_content = new_content.replace('\n', '\r\n')
    with open('src/assets/styles/components.css', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND")
