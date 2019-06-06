import smtplib

from_addr = 'eddiebyler7@gmail.com'
to_addrs = ['eddiebyler7@gmail.com']
subject = 'TEST MESSAGE'
body = 'Test message body \n New line'

email_text = """\
From: {}
To: {}
Subject: {}

{}
""".format(from_addr, ", ".join(to), subject, body) 



try:
	server = smtplib.SMTP('smtp.gmail.com', 587)
	server.ehlo()
	server.starttls()
except:
	print 'Something went wrong opening connection'
