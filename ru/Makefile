all:morph.bin

morph.bin:morph.db make_morph.py
	python make_morph.py

morph.db:make_db.py opencorpora
	python make_db.py

UD_Russian-SynTagRus:
	git clone https://github.com/UniversalDependencies/UD_Russian-SynTagRus.git

clean:
	rm -f morph.bin
