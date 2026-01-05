/* Sendbreak - Send break to serial post using 1200 baud kludge
 *
 * Copyright 2004 Thomas Stewart
 *
 * This is distributed under the terms of the GNU General Public License
 *
 * Sends a break to the serial port specified using the horable 1200 baud
 * kludge. If one sets the serial port to 1200 baud and then send a space
 * charachtar it emulates the out of bound break signal.
 *
 * Version 0.3
 *
 * To compile:
 *      gcc -o sendbreak sendbreak.c -Wall
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <termios.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

void usage(void) {
	printf("SendBreak to a serial port using the 1200 baud kludge\n");
	printf("Usage: sendbreak (-f) [-d device]\n");
	printf("-f force\n");
	printf("-d specify device\n");
}

int main(int argc, char **argv) {
        int c, deviceflag=0, forceflag=0, fd=0;
	char *device=NULL, *input=NULL;
        struct termios oldtermios, newtermios;
        struct stat statbuff;

	while((c = getopt (argc, argv, "d:f")) != -1) {
		switch(c) {
		case 'd':
			deviceflag = 1;
			device = optarg;
			break;
		case 'f':
			forceflag = 1;
			break;
		default:
			usage();
			exit(-1);
		}
	}

        /* quit if no device is given */
	if(!deviceflag) {
		usage();
		exit(-1);
	}

        /* quit if device is not /dev/ttyS or /dev/ttyUSB */
        if((strstr(device, "/dev/ttyS") == NULL) &&
                        (strstr(device, "/dev/ttyUSB") == NULL)) {
                printf("Error: %s is not a serial device\n", device);
		usage();
		exit(-1);
	}

        if(stat(device, &statbuff)) {
                printf("Error: %s device does not exist\n", device);
                usage();
                exit(-1);
        }
                
	if(!forceflag) {
		printf("Type yes to send break to %s, ", device);
		printf("or Ctrl-C to cancel\n");
		scanf("%s", input);
		if(strstr(input, "yes") == NULL)
			exit(-1);
	}

        fd = open(device, O_RDWR | O_NOCTTY | O_NDELAY); 
        if(fd == -1) {
                printf("Error: unable to open device: %s\n", device);
                exit(-1);
        }

        tcgetattr(fd,&oldtermios);
	memcpy(&newtermios, &oldtermios, sizeof(oldtermios));

        newtermios.c_cflag = B1200 | CS8 | CLOCAL;

        tcflush(fd, TCIFLUSH);
        tcsetattr(fd,TCSANOW,&newtermios);

	write(fd, " ", 1);
	usleep(25);

        tcsetattr(fd,TCSANOW,&oldtermios);
	close(fd);
	
	printf("Sent break to %s\n", device);
	exit(0);
}
