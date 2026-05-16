import openpyxl
wb = openpyxl.load_workbook('등장인물.xlsx')
ws = wb.active
with open('dump_utf8.txt', 'w', encoding='utf-8') as f:
  for row in ws.rows:
    f.write(','.join([str(cell.value) for cell in row]) + '\n')
