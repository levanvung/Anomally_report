with open('src/assets/styles/components.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = """.machine-text,
.machine-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #0284c7;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  white-space: nowrap;
}

.machine-text .anticon,
.machine-badge .anticon {
  font-size: 13px;
  color: #0284c7;
}

[data-theme="light"] .machine-text,
[data-theme="light"] .machine-badge {
  color: #0369a1;
}

[data-theme="light"] .machine-text .anticon,
[data-theme="light"] .machine-badge .anticon {
  color: #0284c7;
}

[data-theme="dark"] .machine-text,
[data-theme="dark"] .machine-badge {
  color: #38bdf8;
}

[data-theme="dark"] .machine-text .anticon,
[data-theme="dark"] .machine-badge .anticon {
  color: #38bdf8;
}"""

replacement = """.machine-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #0284c7;
  max-width: 100%;
  vertical-align: middle;
}

.machine-text .machine-icon {
  font-size: 13px;
  color: #0284c7;
  flex-shrink: 0;
}

.machine-text .machine-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  vertical-align: middle;
}

.machine-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #0284c7;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  white-space: nowrap;
}

.machine-badge .anticon {
  font-size: 13px;
  color: #0284c7;
}

[data-theme="light"] .machine-text {
  color: #0369a1;
}

[data-theme="light"] .machine-text .machine-icon {
  color: #0284c7;
}

[data-theme="light"] .machine-badge {
  color: #0369a1;
}

[data-theme="light"] .machine-badge .anticon {
  color: #0284c7;
}

[data-theme="dark"] .machine-text {
  color: #38bdf8;
}

[data-theme="dark"] .machine-text .machine-icon {
  color: #38bdf8;
}

[data-theme="dark"] .machine-badge {
  color: #38bdf8;
}

[data-theme="dark"] .machine-badge .anticon {
  color: #38bdf8;
}"""

# Handle both CRLF and LF
is_crlf = '\r\n' in content
norm_content = content.replace('\r\n', '\n')
norm_target = target.replace('\r\n', '\n')
norm_replacement = replacement.replace('\r\n', '\n')

if norm_target in norm_content:
    new_content = norm_content.replace(norm_target, norm_replacement, 1)
    if is_crlf:
        new_content = new_content.replace('\n', '\r\n')
    with open('src/assets/styles/components.css', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    print("TARGET NOT FOUND IN FILE")
