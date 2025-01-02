import os
import csv
import datetime
import customtkinter as ctk
from tkinter import ttk
import sys

# Caminho para o log
log_path = 'log.txt'

# Redireciona a saída padrão para o arquivo log.txt
sys.stdout = open(log_path, 'a')  # Abre em modo append para adicionar ao log

caminho = 'VNC_horario_sab.csv'

class BusScheduleApp:
    def __init__(self, master):
        # Configuração da janela principal
        self.master = master
        master.title('VILA NOVA CACHOEIRINHA')
        master.attributes('-fullscreen', True)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("dark-blue")

        # Criação do rótulo para exibir os horários
        self.schedule_label = ctk.CTkLabel(master, text='', font=ctk.CTkFont(size=50, weight="bold"))
        self.schedule_label.pack(pady=10)

        # Criação do frame da tabela
        self.table_frame = ctk.CTkFrame(master)
        self.table_frame.pack(fill="both", expand=True, padx=20, pady=20)

        style = ttk.Style()
        style.configure("Treeview", font=('Arial', 35), rowheight=80, background="#333333", foreground="#FFFFFF")
        style.configure("Treeview.Heading", font=('Arial', 40, 'bold'), background="#444444")

        # Criação do widget Treeview
        columns = ('PARADA', 'PARTIDA', 'LINHA', 'DESTINO')
        self.treeview = ttk.Treeview(self.table_frame, columns=columns, show='headings', height=15)

        for col in columns:
            self.treeview.heading(col, text=col)
            if col == 'PARADA':
                self.treeview.column("PARADA", width=210, anchor='center')
            elif col == 'PARTIDA':
                self.treeview.column("PARTIDA", width=210, anchor='center')
            elif col == 'LINHA':
                self.treeview.column("LINHA", width=210, anchor='center')
            elif col == 'DESTINO':
                self.treeview.column("DESTINO", width=800, anchor='w')

        self.treeview.pack(fill="both", expand=True)

        # Variável de controle para alternar exibição
        self.toggle_display = True
        self.current_line_index = 0

        # Loop de atualização dos horários e do relógio
        self.update_schedule()
        self.update_clock()

        # Adiciona o binding para a tecla ESC fechar o programa
        self.master.bind("<Escape>", self.close_program)

    def update_schedule(self):
        # Ler os horários do arquivo CSV
        with open(caminho, 'r', encoding='utf-8') as csv_file:
            csv_reader = csv.DictReader(csv_file, delimiter=';')
            horarios = [row for row in csv_reader]

        # Hora atual
        hora_atual = datetime.datetime.now().time()

        # Filtrar os horários que ainda vão acontecer
        horarios_filtrados = []
        for h in horarios:
            partida_str = h.get('PARTIDA', '').strip()
            if partida_str:
                try:
                    # Converter o horário de partida para objeto datetime.time
                    partida = datetime.datetime.strptime(partida_str, '%H:%M').time()
                    if partida > hora_atual:
                        horarios_filtrados.append(h)
                except ValueError:
                    print(f"Erro ao converter horário: {partida_str}")

        # Agrupar horários por linha
        linhas_grupo = {}
        for h in horarios_filtrados:
            linha = h.get('LINHA', '-')
            if linha not in linhas_grupo:
                linhas_grupo[linha] = []
            linhas_grupo[linha].append(h)

        if horarios_filtrados:
            # Alternar entre exibição de todas as linhas e linha isolada
            if self.toggle_display:
                # Exibir todas as linhas juntas
                self.treeview.delete(*self.treeview.get_children())
                for h in horarios_filtrados:
                    parada = h.get('PARADA', '-')
                    partida = datetime.datetime.strptime(h.get('PARTIDA', '').strip(), '%H:%M').strftime('%H:%M')
                    linha = h.get('LINHA', '-')
                    destino = h.get('DESTINO', '-')
                    self.treeview.insert("", "end", values=(parada, partida, linha, destino))
            else:
                # Exibir todas as próximas partidas da linha isolada
                self.treeview.delete(*self.treeview.get_children())
                linha_atual = list(linhas_grupo.keys())[self.current_line_index]  # Selecionar a linha atual
                for h in linhas_grupo[linha_atual]:
                    parada = h.get('PARADA', '-')
                    partida = datetime.datetime.strptime(h.get('PARTIDA', '').strip(), '%H:%M').strftime('%H:%M')
                    linha_texto = h.get('LINHA', '-')
                    destino = h.get('DESTINO', '-')
                    self.treeview.insert("", "end", values=(parada, partida, linha_texto, destino))

                # Avançar para a próxima linha
                self.current_line_index = (self.current_line_index + 1) % len(linhas_grupo)

            # Alternar o estado da exibição
            self.toggle_display = not self.toggle_display

        else:
            # Se não houver horários futuros, limpar a tabela
            self.treeview.delete(*self.treeview.get_children())

        # Agendar a próxima atualização em 20 segundos
        self.master.after(20000, self.update_schedule)

    def update_clock(self):
        current_time = datetime.datetime.now().strftime('%d/%m/%Y - %H:%M:%S')
        self.schedule_label.configure(text=f"VILA NOVA CACHOEIRINHA | {current_time}")
        self.master.after(1000, self.update_clock)  # Atualiza o relógio a cada segundo

    def close_program(self, event):
        print("Programa finalizado pelo usuário.")
        self.master.destroy()

# Criação da janela principal e execução do loop de eventos do customtkinter
root = ctk.CTk()
app = BusScheduleApp(root)
root.mainloop()

# Fecha o arquivo de log ao final da execução
sys.stdout.close()