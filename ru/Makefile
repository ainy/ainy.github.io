all:morph.idawg grammar.json

morph.idawg:morph.db make_dawg.py
	python make_dawg.py

morph.db:make_db.py opencorpora
	python make_db.py

clean:
	rm -f morph.idawg grammar.json