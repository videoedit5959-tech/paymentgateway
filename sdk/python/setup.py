from setuptools import setup, find_packages

setup(
    name="paysync-python",
    version="1.0.0",
    description="Official Python SDK for PaySync MFS Payment Gateway",
    author="PaySync Engineering",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.7",
)
