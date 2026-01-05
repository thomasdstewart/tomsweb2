/* rhr - RedHat Release, /etc/redhat-release faker
 *
 * Copyright 2005 Thomas Stewart
 *
 * This is distributed under the terms of the GNU General Public License
 *
 * Version 0.1
 *
 * To compile:
 *      gcc -fPIC -rdynamic -g -c -Wall rhr.c
 *      gcc -shared -WI,-soname,librhr.so.1 -o librhr.so.1.0.1 rhr.o -lc -ldl
 *
 *      LD_PRELOAD=/path/to/librhr.so.1.0.1 /path/to/program
 *
 *      This will catch the access function:
 *      printf("%i\n", access("/etc/redhat-release", F_OK));
 *      with this preloaded /etc/redhat-release allways exists :-)
 */

#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int access (char *name, int type) {
        void *handle;
        int (*orig_access)(char*, int);
        char *error;
        
        handle = dlopen("/lib/libc.so.6", RTLD_LAZY);
        if(!handle) {
                fputs (dlerror(), stderr);
                exit(EXIT_FAILURE);
        }
        
        orig_access = dlsym(handle, "access");
        if((error = dlerror()) != NULL) {
                fprintf(stderr, "%s\n", error);
                exit(EXIT_FAILURE);
        }

        if(strstr(name, "/etc/redhat-release")) {
                return 0;
        } else {
                return orig_access(name, type);
        }
}
